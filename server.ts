import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface RoomParticipant {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string;
  isHost: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  volume: number;
  joinedAt: number;
}

interface VoiceRoom {
  id: string;
  name: string;
  description: string;
  hostId: string;
  hostEmail?: string;
  hostName: string;
  hostAvatar: string;
  category: 'Free Fire' | 'Battle Royale' | 'Ranked Push' | 'Casual Squad' | 'Tourney' | 'Community';
  isUnlimited: boolean;
  isPrivate: boolean;
  pinCode?: string;
  wallpaperPreset: string;
  customWallpaperUrl?: string;
  participantCount: number;
  participants: RoomParticipant[];
  isPermanent: boolean;
  createdAt: number;
}

// In-memory room registry with permanent channel support
const rooms = new Map<string, VoiceRoom>();

// Seed default permanent community voice channels (unlimited membership)
const initialRooms: VoiceRoom[] = [
  {
    id: 'ff-grandmaster-hq',
    name: 'Free Fire Grandmaster HQ 🔥',
    description: 'Permanent voice channel for BR Ranked squad comms. Open membership, zero artificial limit.',
    hostId: 'system_host_ff1',
    hostEmail: 'frostnovaofficiall@gmail.com',
    hostName: 'FrostNova (HQ)',
    hostAvatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
    category: 'Free Fire',
    isUnlimited: true,
    isPrivate: false,
    wallpaperPreset: 'freefire',
    participantCount: 0,
    participants: [],
    isPermanent: true,
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'clash-squad-scrims',
    name: 'Clash Squad 4v4 & Scrims Arena',
    description: 'Permanent competitive tournament channel. Scalable voice mesh.',
    hostId: 'system_host_cs',
    hostEmail: 'scrims@kemor.app',
    hostName: 'ViperX',
    hostAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    category: 'Free Fire',
    isUnlimited: true,
    isPrivate: false,
    wallpaperPreset: 'crimson',
    participantCount: 0,
    participants: [],
    isPermanent: true,
    createdAt: Date.now() - 7200000,
  },
  {
    id: 'chill-late-night',
    name: 'Late Night Chill & Lo-Fi Lounge 🌙',
    description: 'Permanent public voice hangout. Relaxed gaming & lo-fi conversation.',
    hostId: 'system_host_luna',
    hostEmail: 'luna@kemor.app',
    hostName: 'LunaGamer',
    hostAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    category: 'Casual Squad',
    isUnlimited: true,
    isPrivate: false,
    wallpaperPreset: 'nebula',
    participantCount: 0,
    participants: [],
    isPermanent: true,
    createdAt: Date.now() - 10800000,
  },
];

for (const r of initialRooms) {
  rooms.set(r.id, r);
}

// Client connection tracking
interface ClientMeta {
  ws: WebSocket;
  roomId?: string;
  userId?: string;
  participant?: RoomParticipant;
}

const clients = new Map<WebSocket, ClientMeta>();

function broadcastToRoom(roomId: string, message: any, excludeWs?: WebSocket) {
  const payload = JSON.stringify(message);
  for (const [ws, meta] of clients.entries()) {
    if (meta.roomId === roomId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function broadcastLobbyRooms() {
  const roomList = Array.from(rooms.values());
  const payload = JSON.stringify({ type: 'rooms-updated', rooms: roomList });
  for (const [ws, meta] of clients.entries()) {
    if (!meta.roomId && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  const meta: ClientMeta = { ws };
  clients.set(ws, meta);

  // Send initial room list on connect
  ws.send(JSON.stringify({ type: 'rooms-updated', rooms: Array.from(rooms.values()) }));

  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'join-room': {
          const { roomId, user } = msg;
          let room = rooms.get(roomId);
          if (!room) {
            // Create permanent channel entry if not already present
            room = {
              id: roomId,
              name: `Voice Channel #${roomId.slice(0, 6)}`,
              description: 'Permanent voice channel',
              hostId: user.userId,
              hostName: user.displayName,
              hostAvatar: user.avatarUrl,
              category: 'Free Fire',
              isUnlimited: true, // Unlimited capacity
              isPrivate: false,
              wallpaperPreset: 'crimson',
              participantCount: 0,
              participants: [],
              isPermanent: true,
              createdAt: Date.now(),
            };
            rooms.set(roomId, room);
          }

          meta.roomId = roomId;
          meta.userId = user.userId;
          meta.participant = user;

          // Remove any duplicate of user
          room.participants = room.participants.filter(p => p.userId !== user.userId);
          room.participants.push(user);
          room.participantCount = room.participants.length;

          // Send current room state & existing peers to joining user
          const otherPeers = room.participants.filter(p => p.userId !== user.userId);
          ws.send(JSON.stringify({
            type: 'room-joined',
            room,
            existingPeers: otherPeers,
          }));

          // Notify other peers in room
          broadcastToRoom(roomId, {
            type: 'peer-joined',
            peer: user,
          }, ws);

          broadcastLobbyRooms();
          break;
        }

        case 'leave-room': {
          const { roomId, userId } = msg;
          const room = rooms.get(roomId);
          if (room) {
            room.participants = room.participants.filter(p => p.userId !== userId);
            room.participantCount = room.participants.length;
            broadcastToRoom(roomId, { type: 'peer-left', peerId: userId }, ws);
            // NOTE: Permanent channels are KEPT in rooms map even if participantCount is 0!
          }
          meta.roomId = undefined;
          meta.participant = undefined;
          broadcastLobbyRooms();
          break;
        }

        // WebRTC Signaling relays (unlimited mesh / peer connections)
        case 'webrtc-offer': {
          const { targetId, senderId, sdp } = msg;
          for (const [otherWs, otherMeta] of clients.entries()) {
            if (otherMeta.userId === targetId && otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: 'webrtc-offer',
                senderId,
                sdp,
              }));
              break;
            }
          }
          break;
        }

        case 'webrtc-answer': {
          const { targetId, senderId, sdp } = msg;
          for (const [otherWs, otherMeta] of clients.entries()) {
            if (otherMeta.userId === targetId && otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: 'webrtc-answer',
                senderId,
                sdp,
              }));
              break;
            }
          }
          break;
        }

        case 'webrtc-ice': {
          const { targetId, senderId, candidate } = msg;
          for (const [otherWs, otherMeta] of clients.entries()) {
            if (otherMeta.userId === targetId && otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: 'webrtc-ice',
                senderId,
                candidate,
              }));
              break;
            }
          }
          break;
        }

        case 'user-state-update': {
          const { roomId, userId, updates } = msg;
          const room = rooms.get(roomId);
          if (room) {
            const p = room.participants.find(x => x.userId === userId);
            if (p) {
              Object.assign(p, updates);
            }
          }
          broadcastToRoom(roomId, {
            type: 'user-state-update',
            userId,
            updates,
          }, ws);
          break;
        }

        case 'user-speaking': {
          const { roomId, userId, isSpeaking, volumeLevel } = msg;
          broadcastToRoom(roomId, {
            type: 'user-speaking',
            userId,
            isSpeaking,
            volumeLevel,
          }, ws);
          break;
        }

        case 'delete-room': {
          const { roomId, hostId } = msg;
          const room = rooms.get(roomId);
          if (room && (room.hostId === hostId || hostId.startsWith('system_'))) {
            // Notify anyone inside room
            broadcastToRoom(roomId, { type: 'room-deleted', roomId });
            rooms.delete(roomId);
            broadcastLobbyRooms();
          }
          break;
        }

        case 'create-room': {
          const newRoom: VoiceRoom = {
            ...msg.room,
            isUnlimited: true,
            isPermanent: true,
            createdAt: Date.now(),
            participants: [],
            participantCount: 0,
          };
          rooms.set(newRoom.id, newRoom);
          broadcastLobbyRooms();
          ws.send(JSON.stringify({ type: 'room-created', room: newRoom }));
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (meta.roomId && meta.userId) {
      const room = rooms.get(meta.roomId);
      if (room) {
        room.participants = room.participants.filter(p => p.userId !== meta.userId);
        room.participantCount = room.participants.length;
        broadcastToRoom(meta.roomId, { type: 'peer-left', peerId: meta.userId });
        // Channel stays persistent even with 0 participants
      }
    }
    clients.delete(ws);
    broadcastLobbyRooms();
  });
});

// REST API Endpoints
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'KEMOR',
    activeRooms: rooms.size,
    connectedSockets: clients.size,
    unlimitedChannels: true,
    timestamp: Date.now(),
  });
});

app.get('/api/rooms', (_req, res) => {
  res.json(Array.from(rooms.values()));
});

app.post('/api/rooms', (req, res) => {
  const roomData = req.body;
  if (!roomData || !roomData.id || !roomData.name) {
    res.status(400).json({ error: 'Room id and name required' });
    return;
  }
  const room: VoiceRoom = {
    ...roomData,
    isUnlimited: true,
    isPermanent: true,
    createdAt: roomData.createdAt || Date.now(),
    participantCount: 0,
    participants: [],
  };
  rooms.set(room.id, room);
  broadcastLobbyRooms();
  res.status(201).json(room);
});

app.delete('/api/rooms/:id', (req, res) => {
  const roomId = req.params.id;
  const hostId = req.query.hostId as string;
  const room = rooms.get(roomId);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  if (room.hostId !== hostId && !hostId?.startsWith('system_')) {
    res.status(403).json({ error: 'Only the channel owner can delete this voice channel.' });
    return;
  }

  // Notify any active room participants
  broadcastToRoom(roomId, { type: 'room-deleted', roomId });
  rooms.delete(roomId);
  broadcastLobbyRooms();

  res.json({ success: true, deletedRoomId: roomId });
});

// Scalable SFU Voice Architecture Information
app.get('/api/voice-architecture', (_req, res) => {
  res.json({
    architecture: 'Hybrid Mesh + SFU Selective Forwarding Unit',
    currentSignaling: 'Native WebSocket Mesh Signaling (Unlimited Peers per Room)',
    sfuProvider: 'LiveKit / Daily.co / Mediasoup Compatible',
    artificialLimits: 'NONE. 0 restrictions on participants per voice channel.',
    realWorldScaleGuidance: {
      standardMesh: '1-10 simultaneous active talkers per room with zero extra cloud infrastructure cost.',
      sfuMode: '100-500+ concurrent listeners/talkers per room when LiveKit SFU URL is attached.',
    },
  });
});

// Vite / Static setup
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, () => {
    console.log(`[KEMOR] Server running on http://localhost:${PORT}`);
    console.log(`[KEMOR] WebSocket signaling active on ws://localhost:${PORT}/ws`);
  });
}

startServer().catch((err) => {
  console.error('[KEMOR] Failed to start server:', err);
});
