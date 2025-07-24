import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { WebRTCService } from './webrtc.service';

@WebSocketGateway({
  namespace: '/webrtc',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
@Injectable()
export class WebRTCGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebRTCGateway.name);

  constructor(private readonly webrtcService: WebRTCService) {}

  afterInit() {
    this.logger.log('WebRTC Gateway Initialized');
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string }
  ) {
    this.webrtcService.joinRoom(client, data.room);
  }

  @SubscribeMessage('webrtc_offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; offer: RTCSessionDescriptionInit }
  ) {
    this.webrtcService.sendOffer(client, data.to, data.offer);
  }

  @SubscribeMessage('webrtc_answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; answer: RTCSessionDescriptionInit }
  ) {
    this.webrtcService.sendAnswer(client, data.to, data.answer);
  }

  @SubscribeMessage('webrtc_candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; candidate: RTCIceCandidateInit }
  ) {
    this.webrtcService.sendIceCandidate(client, data.to, data.candidate);
  }
}
