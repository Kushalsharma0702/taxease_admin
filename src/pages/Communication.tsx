import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Search, Send, User, UserCog, Loader2, RefreshCw } from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
  id: string;
  sender_role: string;
  message: string;
  created_at: string;
  read_by_client: boolean;
  read_by_admin: boolean;
}

interface ClientWithMessages {
  clientId: string;
  clientName: string;
  clientEmail: string;
  messages: ChatMessage[];
  unreadCount: number;
  lastMessageTime: string;
}

export default function Communication() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clientsWithMessages, setClientsWithMessages] = useState<ClientWithMessages[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadAllMessages();
    // Auto-refresh all conversations every 5 seconds
    const interval = setInterval(() => {
      loadAllMessages(false); // Silent refresh
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fast refresh for selected client's messages (every 2 seconds)
  useEffect(() => {
    if (!selectedClient) return;
    
    const fastInterval = setInterval(() => {
      refreshSelectedClientMessages();
    }, 2000);
    
    return () => clearInterval(fastInterval);
  }, [selectedClient]);

  // Subject for new email compose
  const [emailSubject, setEmailSubject] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  const loadAllMessages = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      // Load real users + their email threads
      const [usersResp, threads] = await Promise.all([
        apiService.getClients({ page_size: 100 }),
        apiService.getEmailThreads().catch(() => []),
      ]);

      const users = (usersResp as any).users || (usersResp as any).filings || (usersResp as any).clients || [];

      // Build conversation list from users, enrich with thread messages
      const threadMap: Record<string, any[]> = {};
      for (const t of threads) {
        const cid = t.client_id || t.clientId;
        if (!threadMap[cid]) threadMap[cid] = [];
        threadMap[cid].push({
          id: t.id || t.thread_id,
          sender_role: 'admin',
          message: `${t.subject || 'Email'}: ${t.preview || ''}`,
          created_at: t.created_at || t.last_message_at || '',
          read_by_client: true,
          read_by_admin: true,
        });
      }

      const clientsData: ClientWithMessages[] = users.map((u: any) => {
        const msgs = threadMap[u.id] || [];
        const last = msgs[msgs.length - 1];
        return {
          clientId: u.id,
          clientName: u.name || u.email || 'Unknown',
          clientEmail: u.email || '',
          messages: msgs,
          unreadCount: 0,
          lastMessageTime: last?.created_at || '',
        };
      });

      clientsData.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      setClientsWithMessages(clientsData);
    } catch (error: any) {
      if (showLoading) {
        toast({ title: 'Error', description: 'Failed to load conversations', variant: 'destructive' });
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const refreshSelectedClientMessages = async () => {
    // Re-load threads for the selected client
    if (!selectedClient) return;
    try {
      const threads = await apiService.getEmailThreads();
      const clientThreads = threads.filter((t: any) => (t.client_id || t.clientId) === selectedClient);
      setClientsWithMessages((prev) => prev.map((c) => {
        if (c.clientId !== selectedClient) return c;
        const msgs = clientThreads.map((t: any) => ({
          id: t.id || t.thread_id,
          sender_role: 'admin',
          message: `${t.subject || 'Email'}: ${t.preview || ''}`,
          created_at: t.created_at || '',
          read_by_client: true,
          read_by_admin: true,
        }));
        return { ...c, messages: msgs };
      }));
    } catch { /* silent */ }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadAllMessages(false);
    setIsRefreshing(false);
    toast({ title: 'Refreshed', description: 'Conversations updated' });
  };

  const handleSendMessage = async () => {
    if (!selectedClient || !newMessage.trim()) return;
    const clientData = clientsWithMessages.find((c) => c.clientId === selectedClient);

    setSendingMessage(true);
    try {
      await apiService.sendEmail({
        client_id: selectedClient,
        subject: emailSubject.trim() || `Message to ${clientData?.clientName || 'client'}`,
        body: newMessage.trim(),
      });
      setNewMessage('');
      setEmailSubject('');
      setIsComposing(false);
      await refreshSelectedClientMessages();
      scrollToBottom();
      toast({ title: 'Email sent', description: 'Your email has been sent successfully.' });
    } catch (error: any) {
      toast({
        title: 'Failed to send',
        description: error?.message || 'Could not send email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleMarkAsRead = async (_clientId: string) => {
    // Threads are marked as read server-side on open
  };

  const filteredClients = clientsWithMessages.filter((client) => {
    const query = searchQuery.toLowerCase();
    return (
      client.clientName.toLowerCase().includes(query) ||
      client.clientEmail.toLowerCase().includes(query)
    );
  });

  const selectedClientData = clientsWithMessages.find((c) => c.clientId === selectedClient);

  // Auto-scroll when messages change
  useEffect(() => {
    if (selectedClientData) {
      scrollToBottom();
    }
  }, [selectedClientData?.messages]);

  return (
    <DashboardLayout
      title="Communication"
      breadcrumbs={[{ label: 'Communication' }]}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Clients List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversations
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                <p>No conversations found</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {filteredClients.map((client) => {
                  const lastMessage = client.messages[client.messages.length - 1];
                  const isSelected = selectedClient === client.clientId;
                  
                  return (
                    <div
                      key={client.clientId}
                      onClick={() => {
                        setSelectedClient(client.clientId);
                        handleMarkAsRead(client.clientId);
                      }}
                      className={`p-4 cursor-pointer transition-colors border-b border-border ${
                        isSelected
                          ? 'bg-primary/10 border-l-4 border-l-primary'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm truncate">{client.clientName}</p>
                            {client.unreadCount > 0 && (
                              <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-xs">
                                {client.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{client.clientEmail}</p>
                          {lastMessage && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {lastMessage.message}
                            </p>
                          )}
                          {lastMessage && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages View */}
        <Card className="lg:col-span-2">
          {selectedClientData ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedClientData.clientName}
                      {selectedClientData.unreadCount > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-xs">
                          {selectedClientData.unreadCount}
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{selectedClientData.clientEmail}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleManualRefresh}
                      disabled={isRefreshing}
                      className="h-8 w-8 p-0"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/clients/${selectedClientData.clientId}`)}
                    >
                      View Client
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[600px]">
                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedClientData.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <>
                      {selectedClientData.messages.map((msg) => {
                        const isAdmin = msg.sender_role === 'admin';
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isAdmin
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {isAdmin ? (
                                  <UserCog className="h-4 w-4" />
                                ) : (
                                  <User className="h-4 w-4" />
                                )}
                                <span className="text-xs font-medium">
                                  {isAdmin ? 'Admin' : 'Client'}
                                </span>
                              </div>
                              <p className="text-sm">{msg.message}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Email Compose */}
                <div className="border-t p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Subject (optional)"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="text-sm h-8"
                      disabled={sendingMessage}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write an email to this client..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={sendingMessage}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                    >
                      {sendingMessage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Sends via AWS SES email to the client's email address</p>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[600px] text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm mt-2">Choose a client from the list to view messages</p>
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

