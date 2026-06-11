import apiClient from './apiClient';

export interface Resource {
  id?: string;
  name: string;
  type: string;
  status: string;
  capacity: number;
  location: string;
  availability: string;
}

export const getResources = async (filters: {
  search?: string;
  type?: string;
  location?: string;
  minCapacity?: number;
} = {}) => {
  const response = await apiClient.get('/resources', { params: filters });
  return response.data;
};

export const createResource = async (resource: Omit<Resource, 'id'>) => {
  const response = await apiClient.post('/resources', resource);
  return response.data;
};

export const updateResource = async (id: string, resource: Resource) => {
  const response = await apiClient.put(`/resources/${id}`, resource);
  return response.data;
};

export const deleteResource = async (id: string) => {
  const response = await apiClient.delete(`/resources/${id}`);
  return response.data;
};