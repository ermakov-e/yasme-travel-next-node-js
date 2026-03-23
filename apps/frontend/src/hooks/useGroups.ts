'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export interface GroupMember {
  id: string
  userId: string
  role: 'OWNER' | 'MEMBER'
  joinedAt: string
  user: {
    id: string
    name: string
    avatarUrl: string | null
  }
}

export interface Group {
  id: string
  name: string
  coverKey: string | null
  coverUrl: string | null
  lat: number
  lng: number
  address: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
  members: GroupMember[]
  _count: {
    photos: number
    members: number
  }
}

export interface CreateGroupData {
  name: string
  coverKey?: string
  lat: number
  lng: number
  address?: string
  memberIds?: string[]
}

interface PaginatedGroups {
  data: Group[]
  total: number
  page: number
  limit: number
}

export function useGroups(page = 1, limit = 20) {
  return useQuery<PaginatedGroups>({
    queryKey: ['groups', page, limit],
    queryFn: () => api.get(`/groups?page=${page}&limit=${limit}`),
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useGroup(id: string) {
  return useQuery<Group>({
    queryKey: ['group', id],
    queryFn: () => api.get(`/groups/${id}`),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateGroupData) => api.post<Group>('/groups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useUpdateGroup(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<CreateGroupData>) =>
      api.patch<Group>(`/groups/${id}`, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['group', id], updated)
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete(`/groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useAddMember(groupId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) =>
      api.post(`/groups/${groupId}/members`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
    },
  })
}
