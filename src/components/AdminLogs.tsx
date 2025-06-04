
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Shield, Clock } from 'lucide-react';
import { useAdminLogs } from '@/hooks/useSupabaseData';

const AdminLogs = () => {
  const { adminLogs, loading } = useAdminLogs();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = adminLogs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.admin_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionColor = (action: string) => {
    if (action.includes('ADD')) return 'bg-green-500';
    if (action.includes('UPDATE')) return 'bg-blue-500';
    if (action.includes('DELETE')) return 'bg-red-500';
    return 'bg-gray-500';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const groupLogsByDate = (logs: any[]) => {
    const grouped = logs.reduce((acc, log) => {
      const date = new Date(log.timestamp).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(log);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(grouped).sort(([a], [b]) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
  };

  const groupedLogs = groupLogsByDate(filteredLogs);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Logs</h1>
          <p className="text-muted-foreground">Track all administrative actions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Activity Monitor</span>
          </CardTitle>
          <CardDescription>
            All administrative actions are logged here for audit purposes
          </CardDescription>
          
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading logs...</div>
          ) : groupedLogs.length === 0 ? (
            <div className="text-center py-8">No logs found</div>
          ) : (
            <div className="space-y-6">
              {groupedLogs.map(([date, logs]) => (
                <div key={date}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-medium text-muted-foreground">{date}</h3>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Admin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getActionColor(log.action)} text-white`}>
                                {log.action.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-md">
                              <div className="truncate" title={log.details}>
                                {log.details}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {log.admin_id}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Summary</CardTitle>
          <CardDescription>Quick overview of recent actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {adminLogs.filter(log => log.action.includes('ADD')).length}
              </div>
              <div className="text-sm text-muted-foreground">Items Added</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {adminLogs.filter(log => log.action.includes('UPDATE')).length}
              </div>
              <div className="text-sm text-muted-foreground">Items Updated</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {adminLogs.filter(log => log.action.includes('DELETE')).length}
              </div>
              <div className="text-sm text-muted-foreground">Items Deleted</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogs;
