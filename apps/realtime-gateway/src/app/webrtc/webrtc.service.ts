import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class WebRTCService {
  private readonly logger = new Logger(WebRTCService.name);
  private readonly rooms = new Map<string, Set<string>>();

  joinRoom(client: Socket, room: string) {
    client.join(room);
    
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(client.id);
    
    // Notify others in the room
    client.to(room).emit('user_joined', { userId: client.id });
    
    this.logger.log(`Client ${client.id} joined room ${room}`);
  }

  sendOffer(client: Socket, to: string, offer: RTCSessionDescriptionInit) {
    client.to(to).emit('webrtc_offer', {
      from: client.id,
      offer,
    });
  }

  sendAnswer(client: Socket, to: string, answer: RTCSessionDescriptionInit) {
    client.to(to).emit('webrtc_answer', {
      from: client.id,
      answer,
    });
  }

  sendIceCandidate(client: Socket, to: string, candidate: RTCIceCandidateInit) {
    client.to(to).emit('webrtc_candidate', {
      from: client.id,
      candidate,
    });
  }

  leaveRoom(client: Socket, room: string) {
    client.leave(room);
    
    if (this.rooms.has(room)) {
      this.rooms.get(room)!.delete(client.id);
      if (this.rooms.get(room)!.size === 0) {
        this.rooms.delete(room);
      }
    }
    
    // Notify others in the room
    client.to(room).emit('user_left', { userId: client.id });
    
    this.logger.log(`Client ${client.id} left room ${room}`);
  }
}
