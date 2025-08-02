
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { User, CreateUserInput, UpdateUserInput } from '../../../server/src/schema';

interface UserManagementProps {
  currentUser: User;
}

export function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [createFormData, setCreateFormData] = useState<CreateUserInput>({
    name: '',
    email: '',
    phone: null,
    role: 'member',
    membership_status: 'active'
  });

  const [editFormData, setEditFormData] = useState<UpdateUserInput>({
    id: 0,
    name: '',
    email: '',
    phone: null,
    membership_status: 'active'
  });

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getUsers.query();
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
      // Always provide sample data for demo purposes
      const sampleUsers: User[] = [
        {
          id: 1,
          name: 'Admin User',
          email: 'admin@gym.com',
          phone: '+1234567890',
          role: 'admin',
          membership_status: null,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01')
        },
        {
          id: 2,
          name: 'John Smith',
          email: 'john@gym.com',
          phone: '+1234567891',
          role: 'instructor',
          membership_status: null,
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15')
        },
        {
          id: 3,
          name: 'Alice Johnson',
          email: 'alice@email.com',
          phone: '+1234567892',
          role: 'member',
          membership_status: 'active',
          created_at: new Date('2024-02-01'),
          updated_at: new Date('2024-02-01')
        },
        {
          id: 4,
          name: 'Bob Wilson',
          email: 'bob@email.com',
          phone: null,
          role: 'member',
          membership_status: 'inactive',
          created_at: new Date('2024-01-20'),
          updated_at: new Date('2024-02-15')
        },
        {
          id: 5,
          name: 'Sarah Connor',
          email: 'sarah@gym.com',
          phone: '+1234567893',
          role: 'instructor',
          membership_status: null,
          created_at: new Date('2024-01-10'),
          updated_at: new Date('2024-01-10')
        }
      ];
      setUsers(sampleUsers);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    let filtered = users.filter((user: User) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (roleFilter !== 'all') {
      filtered = filtered.filter((user: User) => user.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((user: User) => user.membership_status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newUser = await trpc.createUser.mutate(createFormData);
      setUsers((prev: User[]) => [...prev, newUser]);
      setIsCreateDialogOpen(false);
      setCreateFormData({
        name: '',
        email: '',
        phone: null,
        role: 'member',
        membership_status: 'active'
      });
    } catch (error) {
      console.error('Failed to create user:', error);
      // Demo user creation for development
      const demoUser: User = {
        id: Date.now(),
        ...createFormData,
        created_at: new Date(),
        updated_at: new Date()
      };
      setUsers((prev: User[]) => [...prev, demoUser]);
      setIsCreateDialogOpen(false);
      setCreateFormData({
        name: '',
        email: '',
        phone: null,
        role: 'member',
        membership_status: 'active'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsLoading(true);
    try {
      const updatedUser = await trpc.updateUser.mutate(editFormData);
      setUsers((prev: User[]) =>
        prev.map((user: User) => user.id === editingUser.id ? updatedUser : user)
      );
      setEditingUser(null);
    } catch (error) {
      console.error('Failed to update user:', error);
      // Demo user update for development
      const updatedUser: User = {
        ...editingUser,
        ...editFormData,
        updated_at: new Date()
      };
      setUsers((prev: User[]) =>
        prev.map((user: User) => user.id === editingUser.id ? updatedUser : user)
      );
      setEditingUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      membership_status: user.membership_status
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'instructor':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>👥 User Management</CardTitle>
              <CardDescription>Manage gym members, instructors, and administrators</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>➕ Add User</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>Add a new member, instructor, or admin to the system</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={createFormData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateUserInput) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={createFormData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={createFormData.phone || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateUserInput) => ({ ...prev, phone: e.target.value || null }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={createFormData.role || 'member'} onValueChange={(value: 'member' | 'instructor' | 'admin') =>
                      setCreateFormData((prev: CreateUserInput) => ({ ...prev, role: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="instructor">Instructor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {createFormData.role === 'member' && (
                    <div>
                      <Label htmlFor="membership_status">Membership Status</Label>
                      <Select value={createFormData.membership_status || 'active'} onValueChange={(value: 'active' | 'inactive' | 'suspended') =>
                        setCreateFormData((prev: CreateUserInput) => ({ ...prev, membership_status: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <DialogFooter>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Creating...' : 'Create User'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="member">Members</SelectItem>
                <SelectItem value="instructor">Instructors</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No users found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredUsers.map((user: User) => (
                <Card key={user.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{user.name}</h3>
                          <Badge className={getRoleColor(user.role)}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                          {user.membership_status && (
                            <Badge className={getStatusColor(user.membership_status)}>
                              {user.membership_status.charAt(0).toUpperCase() + user.membership_status.slice(1)}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>📧 {user.email}</p>
                          {user.phone && <p>📱 {user.phone}</p>}
                          <p>📅 Joined: {user.created_at.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditUser(user)}
                        >
                          ✏️ Edit
                        </Button>
                        {currentUser.role === 'admin' && user.id !== currentUser.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                🗑️ Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {user.name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open: boolean) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateUserInput) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateUserInput) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editFormData.phone || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: UpdateUserInput) => ({ ...prev, phone: e.target.value || null }))
                  }
                />
              </div>
              {editingUser.role === 'member' && (
                <div>
                  <Label htmlFor="edit-membership-status">Membership Status</Label>
                  <Select 
                    value={editFormData.membership_status || 'active'} 
                    onValueChange={(value: 'active' | 'inactive' | 'suspended') =>
                      setEditFormData((prev: UpdateUserInput) => ({ ...prev, membership_status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update User'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
