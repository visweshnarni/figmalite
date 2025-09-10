
import { io, Socket } from 'socket.io-client';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

let socket: Socket;

export const initSocket = (): Socket => {
  if (socket) return socket;
  
  socket = io(SERVER_URL);

  socket.on('connect', () => {
    console.log('Connected to socket server with id:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from socket server');
  });

  return socket;
};

export const getSocket = (): Socket => {
    if (!socket) {
        return initSocket();
    }
    return socket;
};
