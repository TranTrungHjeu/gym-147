import { Accelerometer, Gyroscope } from 'expo-sensors';
import { Subscription } from 'expo-sensors/build/DeviceSensor';

class SensorService {
  private accelerometerSubscription: Subscription | null = null;
  private gyroscopeSubscription: Subscription | null = null;
  private movementData: {
    acceleration: { x: number; y: number; z: number }[];
    rotation: { x: number; y: number; z: number }[];
  } = {
    acceleration: [],
    rotation: [],
  };

  // Start listening to sensors
  async startListening(updateInterval: number = 1000): Promise<boolean> {
    try {
      // Check if sensors are available
      const isAccelerometerAvailable = await Accelerometer.isAvailableAsync();
      const isGyroscopeAvailable = await Gyroscope.isAvailableAsync();

      if (!isAccelerometerAvailable && !isGyroscopeAvailable) {
        console.warn('[SENSORS] No sensors available');
        return false;
      }

      // Set update interval
      if (isAccelerometerAvailable) {
        Accelerometer.setUpdateInterval(updateInterval);
        this.accelerometerSubscription = Accelerometer.addListener((data) => {
          this.movementData.acceleration.push({
            x: data.x,
            y: data.y,
            z: data.z,
          });

          // Keep only last 60 samples (1 minute if 1s interval)
          if (this.movementData.acceleration.length > 60) {
            this.movementData.acceleration.shift();
          }
        });
      }

      if (isGyroscopeAvailable) {
        Gyroscope.setUpdateInterval(updateInterval);
        this.gyroscopeSubscription = Gyroscope.addListener((data) => {
          this.movementData.rotation.push({
            x: data.x,
            y: data.y,
            z: data.z,
          });

          if (this.movementData.rotation.length > 60) {
            this.movementData.rotation.shift();
          }
        });
      }

      console.log('[SENSORS] Started listening:', {
        accelerometer: isAccelerometerAvailable,
        gyroscope: isGyroscopeAvailable,
        interval: updateInterval,
      });

      return true;
    } catch (error) {
      console.error('[SENSORS] Start listening error:', error);
      return false;
    }
  }

  // Stop listening
  stopListening() {
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
      this.accelerometerSubscription = null;
    }

    if (this.gyroscopeSubscription) {
      this.gyroscopeSubscription.remove();
      this.gyroscopeSubscription = null;
    }

    this.movementData = { acceleration: [], rotation: [] };
    console.log('[SENSORS] Stopped listening');
  }

  // Get current movement data
  getMovementData(): {
    hasMovement: boolean;
    movementIntensity: number; // 0-1
    acceleration: { x: number; y: number; z: number } | null;
    rotation: { x: number; y: number; z: number } | null;
  } {
    const lastAccel =
      this.movementData.acceleration[this.movementData.acceleration.length - 1];
    const lastRotation =
      this.movementData.rotation[this.movementData.rotation.length - 1];

    // Calculate movement intensity
    let movementIntensity = 0;
    if (lastAccel) {
      // Calculate magnitude of acceleration vector
      const magnitude = Math.sqrt(
        lastAccel.x ** 2 + lastAccel.y ** 2 + lastAccel.z ** 2
      );

      // Normalize to 0-1 (assuming max ~20 m/s² for vigorous activity)
      // Gravity is ~9.8 m/s², so we subtract it first
      const gravityAdjusted = Math.max(0, magnitude - 9.8);
      movementIntensity = Math.min(1, gravityAdjusted / 10);
    }

    return {
      hasMovement: movementIntensity > 0.1, // Threshold for "has movement"
      movementIntensity,
      acceleration: lastAccel || null,
      rotation: lastRotation || null,
    };
  }

  // Get sensor data for API
  getSensorDataForAPI(): any {
    const movement = this.getMovementData();

    return {
      movement: movement.movementIntensity,
      has_movement: movement.hasMovement,
      acceleration: movement.acceleration,
      rotation: movement.rotation,
      timestamp: new Date().toISOString(),
    };
  }
}

export const sensorService = new SensorService();
