
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 4000;
const DATA_FILE = path.join(__dirname, 'data', 'projects.json');

// --- Persistence ---
let documents = {};

const loadDocuments = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      documents = JSON.parse(data);
      console.log('Documents loaded from file.');
    } else {
      fs.writeFileSync(DATA_FILE, JSON.stringify({}));
      console.log('Data file created.');
    }
  } catch (err) {
    console.error('Error loading documents:', err);
    documents = {};
  }
};

const saveDocument = (docId) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(documents, null, 2));
    // console.log(`Document ${docId} saved.`);
  } catch (err) {
    console.error('Error saving document:', err);
  }
};

// --- In-memory Document State ---
// `documents` is loaded above

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('join-doc', (docId) => {
    socket.join(docId);
    console.log(`User ${socket.id} joined doc ${docId}`);

    // If document doesn't exist, create it
    if (!documents[docId]) {
      documents[docId] = { elements: {}, lastUpdated: {} };
    }

    // Send the current document state to the new user
    socket.emit('doc-state', documents[docId].elements);
  });

  socket.on('op', (op) => {
    const { docId, action, elementId, payload } = op;
    if (!documents[docId] && action !== 'presence') return;

    // Handle presence separately as it's ephemeral and doesn't need persistence
    if (action === 'presence') {
      // Just broadcast to others in the room
      socket.broadcast.to(docId).emit('op', op);
      return;
    }

    const doc = documents[docId];
    let processedOp = { ...op, serverTimestamp: Date.now() };

    // --- Conflict Resolution & State Update Logic ---
    switch (action) {
      case 'create':
        doc.elements[elementId] = payload.element;
        doc.lastUpdated[elementId] = {};
        for (const key in payload.element) {
          doc.lastUpdated[elementId][key] = processedOp.serverTimestamp;
        }
        break;

      case 'update':
        if (doc.elements[elementId]) {
          const element = doc.elements[elementId];
          const lastUpdated = doc.lastUpdated[elementId];
          const updatedPayload = {};
          
          for (const key in payload) {
            element[key] = payload[key];
            lastUpdated[key] = processedOp.serverTimestamp;
            updatedPayload[key] = payload[key];
          }
          processedOp.payload = updatedPayload;
        }
        break;

      case 'delete':
        delete doc.elements[elementId];
        delete doc.lastUpdated[elementId];
        break;

      case 'lock':
        if (doc.elements[elementId]) {
          if (!doc.elements[elementId].lockedBy || doc.elements[elementId].lockedBy === op.userId) {
             doc.elements[elementId].lockedBy = op.userId;
          } else {
            return;
          }
        }
        break;
      
      case 'unlock':
        if (doc.elements[elementId] && doc.elements[elementId].lockedBy === op.userId) {
           delete doc.elements[elementId].lockedBy;
        }
        break;

      default:
        console.warn(`Unknown op action: ${action}`);
        return;
    }

    // Save document state after modification
    saveDocument(docId);

    // Broadcast the processed operation to all clients in the room, including sender
    io.to(docId).emit('op', processedOp);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    // For each room the user was in (which corresponds to a docId)
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        const docId = room;
        // Notify other clients that this user has left.
        socket.broadcast.to(docId).emit('user-left', socket.id);
        
        // Clean up any locks held by the disconnected user
        const doc = documents[docId];
        if (doc && doc.elements) {
          Object.values(doc.elements).forEach(element => {
            if (element.lockedBy === socket.id) {
              delete element.lockedBy;
              // Broadcast the unlock op so clients update their UI
              const unlockOp = {
                opId: uuidv4(),
                docId: docId,
                userId: 'server', // System-initiated action
                action: 'unlock',
                elementId: element.id,
                timestamp: Date.now(),
                serverTimestamp: Date.now(),
              };
              io.to(docId).emit('op', unlockOp);
            }
          });
          saveDocument(docId); // Save the changes after unlocking
        }
      }
    });
  });
});

server.listen(PORT, () => {
  loadDocuments();
  console.log(`Server listening on *:${PORT}`);
});
