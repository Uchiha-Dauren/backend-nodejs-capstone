import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import SearchPage from './components/SearchPage/SearchPage';
import LoginPage from './components/LoginPage/LoginPage';
import Profile from './components/Profile/Profile';
import { apiRequest } from './api';
jest.mock('./api', () => ({ ...jest.requireActual('./api'), apiRequest: jest.fn() }));
beforeEach(() => { sessionStorage.clear(); jest.clearAllMocks(); });
function wrap(component) { return render(<MemoryRouter><AppProvider>{component}</AppProvider></MemoryRouter>); }
test('restores the signed-in identity after a page reload', () => {
  sessionStorage.setItem('auth-token', 'test-token'); sessionStorage.setItem('name', 'Demo Person');
  function Status() { const { isLoggedIn, userName } = useAppContext(); return <p>{isLoggedIn ? userName : 'Signed out'}</p>; }
  wrap(<Status />);
  expect(screen.getByText('Demo Person')).toBeInTheDocument();
  expect(sessionStorage.getItem('auth-token')).toBe('test-token');
});
test('search sends controlled filters and links to the item detail route', async () => {
  apiRequest.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: '12', name: 'Sofa', description: 'Comfortable sofa', category: 'Living', condition: 'Like New' }]);
  wrap(<SearchPage />);
  await screen.findByRole('button', { name: 'Search' });
  fireEvent.change(screen.getByLabelText('Item name'), { target: { value: 'sofa' } });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Living' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(await screen.findByRole('link', { name: 'View Details' })).toHaveAttribute('href', '/app/item/12');
  expect(apiRequest.mock.calls[1][0]).toBe('/api/secondchance/search?name=sofa&category=Living&condition=&age_years=10');
});
test('failed login is visible and does not create a session', async () => {
  apiRequest.mockRejectedValue(new Error('Invalid email or password'));
  wrap(<LoginPage />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'demo@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'incorrect' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Login' }).closest('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  expect(sessionStorage.getItem('auth-token')).toBeNull();
});
test('profile saves the authenticated user name and keeps the server email', async () => {
  sessionStorage.setItem('auth-token', 'test-token');
  apiRequest.mockResolvedValueOnce({ name: 'Demo Person', email: 'demo@example.test' }).mockResolvedValueOnce({ message: 'Profile updated' });
  wrap(<Routes><Route path="*" element={<Profile />} /></Routes>);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit profile' }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated Person' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('updated successfully'));
  expect(sessionStorage.getItem('name')).toBe('Updated Person');
  expect(apiRequest.mock.calls[1][1].body).toBe(JSON.stringify({ name: 'Updated Person' }));
  expect(screen.getByText('demo@example.test')).toBeInTheDocument();
});
