// Schedule service for API calls
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3003';

export class ScheduleService {
  static async health() {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Schedule service unavailable');
    }
  }

  static async getStats() {
    try {
      const response = await axios.get(`${API_BASE_URL}/stats`);
      return response.data?.data?.stats || {};
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get schedule stats');
    }
  }

  static async getClasses() {
    try {
      const response = await axios.get(`${API_BASE_URL}/classes`);
      return response.data?.data?.items || [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get classes');
    }
  }

  static async getInstructors() {
    try {
      const response = await axios.get(`${API_BASE_URL}/instructors`);
      return response.data?.data?.items || [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get instructors');
    }
  }

  static async getRooms() {
    try {
      const response = await axios.get(`${API_BASE_URL}/rooms`);
      return response.data?.data?.items || [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get rooms');
    }
  }

  static async getSchedules() {
    try {
      const response = await axios.get(`${API_BASE_URL}/schedules`);
      return response.data?.data?.items || [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get schedules');
    }
  }

  static async createClass(classData: any) {
    try {
      const response = await axios.post(`${API_BASE_URL}/classes`, classData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create class');
    }
  }

  static async createInstructor(instructorData: any) {
    try {
      const response = await axios.post(`${API_BASE_URL}/instructors`, instructorData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create instructor');
    }
  }

  static async createRoom(roomData: any) {
    try {
      const response = await axios.post(`${API_BASE_URL}/rooms`, roomData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create room');
    }
  }

  static async createSchedule(scheduleData: any) {
    try {
      const response = await axios.post(`${API_BASE_URL}/schedules`, scheduleData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create schedule');
    }
  }
}
