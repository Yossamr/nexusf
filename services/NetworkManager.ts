import mqtt from 'mqtt';

type ConnectionMode = 'LOCAL' | 'CLOUD' | 'DISCONNECTED';
type MessageHandler = (topic: string, payload: any) => void;
type StatusHandler = (isConnected: boolean, mode: ConnectionMode) => void;

export class NetworkManager {
    private ws: WebSocket | null = null;
    private mqttClient: mqtt.MqttClient | null = null;
    private localIp: string;
    private mode: ConnectionMode = 'DISCONNECTED';
    private reconnectTimer: any = null;
    private isDisposed = false;

    // Callbacks
    public onMessage: MessageHandler = () => {};
    public onStatusChange: StatusHandler = () => {};

    constructor(localIp: string = '192.168.4.1') {
        this.localIp = localIp;
    }

    public updateLocalIp(ip: string) {
        this.localIp = ip;
        if (this.mode === 'LOCAL') {
            this.disconnectLocal();
            this.connect();
        }
    }

    public connect() {
        if (this.isDisposed) return;
        // Try Local First
        this.connectLocal();
    }

    private connectLocal() {
        if (this.ws) return; // Already trying or connected

        console.log(`🔌 [NetworkManager] Trying Local WS: ws://${this.localIp}/ws`);
        try {
            this.ws = new WebSocket(`ws://${this.localIp}/ws`);

            this.ws.onopen = () => {
                console.log("✅ [NetworkManager] Local WS Connected");
                this.mode = 'LOCAL';
                this.onStatusChange(true, 'LOCAL');
                
                // Stop MQTT if running (to save resources/bandwidth)
                if (this.mqttClient) {
                    console.log("🛑 [NetworkManager] Disconnecting Cloud (Local is preferred)");
                    this.mqttClient.end();
                    this.mqttClient = null;
                }

                // Sync State
                this.send({ action: "get_all_states" });
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.onMessage('local', data);
                } catch (e) {
                    console.error("WS Parse Error", e);
                }
            };

            this.ws.onclose = () => {
                console.warn("⚠️ [NetworkManager] Local WS Closed");
                this.ws = null;
                
                if (this.mode === 'LOCAL') {
                    this.mode = 'DISCONNECTED';
                    this.onStatusChange(false, 'DISCONNECTED');
                }

                // Requirement: Wait 3s before retry (or fallback)
                if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
                this.reconnectTimer = setTimeout(() => {
                    // If we were local, try to reconnect local. 
                    // But if it fails repeatedly, we should try cloud.
                    // For now, let's try to fallback to cloud immediately if local drops, 
                    // AND schedule a local retry check.
                    
                    this.connectCloud(); // Fallback to cloud
                    // We can also periodically check local availability here if needed
                }, 3000);
            };

            this.ws.onerror = (err) => {
                console.error("❌ [NetworkManager] Local WS Error", err);
                // The onclose will trigger the fallback logic
            };

        } catch (e) {
            console.error("Local Connect Exception", e);
            this.connectCloud();
        }
    }

    private connectCloud() {
        if (this.mqttClient?.connected) return; // Already connected
        if (this.mode === 'LOCAL') return; // Don't connect cloud if local is working

        console.log("☁️ [NetworkManager] Connecting to Cloud MQTT...");
        
        const options: mqtt.IClientOptions = {
            clean: true,
            connectTimeout: 5000,
            clientId: 'nexus_app_' + Math.random().toString(16).substring(2, 10),
            username: 'nexus_admin',
            password: 'Nexus@2026',
            protocolVersion: 4
        };

        // HiveMQ Cloud WSS
        const brokerUrl = 'wss://e462158e43674f3faf283e5e3390e2ff.s1.eu.hivemq.cloud:8883/mqtt';

        try {
            this.mqttClient = mqtt.connect(brokerUrl, options);

            this.mqttClient.on('connect', () => {
                console.log("✅ [NetworkManager] Cloud MQTT Connected");
                this.mode = 'CLOUD';
                this.onStatusChange(true, 'CLOUD');
                
                this.mqttClient?.subscribe('nexus/cloud/state', { qos: 1 });
                
                // Sync State
                this.send({ action: "get_all_states" });
            });

            this.mqttClient.on('message', (topic, message) => {
                try {
                    const payload = JSON.parse(message.toString());
                    this.onMessage(topic, payload);
                } catch (e) {
                    console.error("MQTT Parse Error", e);
                }
            });

            this.mqttClient.on('error', (err) => {
                console.error("❌ [NetworkManager] MQTT Error", err);
            });

            this.mqttClient.on('offline', () => {
                console.warn("⚠️ [NetworkManager] MQTT Offline");
                if (this.mode === 'CLOUD') {
                    this.mode = 'DISCONNECTED';
                    this.onStatusChange(false, 'DISCONNECTED');
                }
                // MQTT library handles reconnection automatically usually, 
                // but we might want to retry local periodically?
                this.retryLocalPeriodically();
            });

        } catch (e) {
            console.error("MQTT Connect Exception", e);
        }
    }

    private retryLocalPeriodically() {
        // Simple mechanism to check if local is back
        setTimeout(() => {
            if (this.mode !== 'LOCAL') {
                this.connectLocal();
            }
        }, 10000);
    }

    public send(payload: any) {
        const strPayload = JSON.stringify(payload);
        
        if (this.mode === 'LOCAL' && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(strPayload);
            console.log("📤 [Sent Local]", payload);
        } else if (this.mqttClient && this.mqttClient.connected) {
            this.mqttClient.publish('nexus/cloud/commands', strPayload, { qos: 1 });
            console.log("📤 [Sent Cloud]", payload);
        } else {
            console.warn("⚠️ [NetworkManager] Cannot send, disconnected.", payload);
        }
    }

    public dispose() {
        this.isDisposed = true;
        if (this.ws) this.ws.close();
        if (this.mqttClient) this.mqttClient.end();
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    }
}
