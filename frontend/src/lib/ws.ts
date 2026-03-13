import type { BuildEvent } from "./types";

export type WSCallback = (event: BuildEvent) => void;

export class BuildMeWS {
  private ws: WebSocket | null = null;
  private callbacks: WSCallback[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  connect() {
    if (typeof window === "undefined") return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/api/ws?token=${this.token}`;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "ping") {
          this.ws?.send(JSON.stringify({ type: "pong" }));
          return;
        }
        this.callbacks.forEach((cb) => cb(data as BuildEvent));
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  subscribe(projectId: number) {
    this.ws?.send(JSON.stringify({ type: "subscribe", project_id: projectId }));
  }

  unsubscribe(projectId: number) {
    this.ws?.send(
      JSON.stringify({ type: "unsubscribe", project_id: projectId }),
    );
  }

  onEvent(cb: WSCallback) {
    this.callbacks.push(cb);
    return () => {
      this.callbacks = this.callbacks.filter((c) => c !== cb);
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.callbacks = [];
  }
}
