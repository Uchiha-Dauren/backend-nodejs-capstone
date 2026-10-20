// Empty origin keeps the production client and API on the same deployed host.
const config = { backendUrl: (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '') };
export const imageUrl = (path) => path && (/^https?:\/\//.test(path) ? path : `${config.backendUrl}${path}`);
export { config as urlConfig };
