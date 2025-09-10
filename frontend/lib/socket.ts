import { io, Socket } from 'socket.io-client';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

export const createSocket = (): Socket => {
  // The `forceNew` option is important to ensure that each browser tab
  // gets its own connection, rather than sharing one. This is crucial
  // for collaboration to work across multiple tabs.
  const socket = io(SERVER_URL, { forceNew: true });

  socket.on('connect', () => {
    console.log('Connected to socket server with id:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from socket server');
  });

  return socket;
};
