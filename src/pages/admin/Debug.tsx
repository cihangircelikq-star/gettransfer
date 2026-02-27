import React, { useEffect, useState, useCallback } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { Button } from '@/components/ui/Button'
import { API } from '@/utils/api'
import { useDriverStore } from '@/stores/driverStore'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'
import { 
  RefreshCw, Copy, CheckCircle, XCircle, AlertTriangle, 
  Database, Server, Users, Clock, Bug, Download
} from 'lucide-react'

export const AdminDebug: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [systemStatus, setSystemStatus] = useState<any>(null)
  const [frontendLogs, setFrontendLogs] = useState<any[]>([])
  const [lastRefresh, setLastRefresh] = useState<string>('')
  
  const { user } = useAuthStore()
  const driverStore = useDriverStore()
  
  // Frontend log toplayıcı
  const addLog = useCallback((type: string, message: string, data?: any) => {
    setFrontendLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    }])
  }, [])
  
  // Sistem durumunu çek
  const fetchSystemStatus = async () => {
    setLoading(true)
    addLog('INFO', 'Sistem durumu çekiliyor...')
    
    try {
      const res = await fetch(`${API}/drivers/system-status`)
      const j = await res.json()
      
      if (j.success) {
        setSystemStatus(j.data)
        setLastRefresh(new Date().toLocaleString('tr-TR'))
        addLog('SUCCESS', 'Sistem durumu alındı', {
          pending: j.data.summary?.pendingCount,
          approved: j.data.summary?.approvedCount,
          issues: j.data.summary?.potentialIssues?.length || 0
        })
      } else {
        addLog('ERROR', 'Sistem durumu alınamadı', j)
      }
    } catch (e) {
      addLog('ERROR', 'Bağlantı hatası', e)
    } finally {
      setLoading(false)
    }
  }
  
  // Sürücü onayla
  const approveDriver = async (driverId: string) => {
    addLog('INFO', `Sürücü onaylanıyor: ${driverId}`)
    
    try {
      const res = await fetch(`${API}/drivers/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: driverId })
      })
      const j = await res.json()
      
      if (j.success) {
        addLog('SUCCESS', `Sürücü onaylandı: ${driverId}`, j.data)
        toast.success('Sürücü onaylandı!')
        // Durumu yenile
        setTimeout(fetchSystemStatus, 1000)
      } else {
        addLog('ERROR', `Onay başarısız: ${driverId}`, j)
        toast.error(`Onay başarısız: ${j.error}`)
      }
    } catch (e) {
      addLog('ERROR', 'Onay hatası', e)
      toast.error('Bağlantı hatası')
    }
  }
  
  // Sürücü debug
  const debugDriver = async (driverId: string) => {
    addLog('INFO', `Sürücü debug: ${driverId}`)
    
    try {
      const res = await fetch(`${API}/drivers/debug/${driverId}`)
      const j = await res.json()
      
      if (j.success) {
        addLog('DEBUG', `Sürücü durumu: ${driverId}`, j.data)
      } else {
        addLog('ERROR', `Debug başarısız: ${driverId}`, j)
      }
    } catch (e) {
      addLog('ERROR', 'Debug hatası', e)
    }
  }
  
  // Tümünü kopyala
  const copyAll = () => {
    const fullReport = {
      timestamp: new Date().toISOString(),
      frontend: {
        user: user ? { id: user.id, email: user.email, role: user.role } : null,
        driverStore: {
          me: driverStore.me,
          approved: driverStore.approved,
          requestsCount: driverStore.requests.length
        }
      },
      backend: systemStatus,
      logs: frontendLogs
    }
    
    navigator.clipboard.writeText(JSON.stringify(fullReport, null, 2))
      .then(() => toast.success('Tüm bilgiler kopyalandı!'))
      .catch(() => toast.error('Kopyalama başarısız'))
  }
  
  // JSON olarak indir
  const downloadJson = () => {
    const fullReport = {
      timestamp: new Date().toISOString(),
      frontend: {
        user: user ? { id: user.id, email: user.email, role: user.role } : null,
        driverStore: {
          me: driverStore.me,
          approved: driverStore.approved,
          requestsCount: driverStore.requests.length
        }
      },
      backend: systemStatus,
      logs: frontendLogs
    }
    
    const blob = new Blob([JSON.stringify(fullReport, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-report-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  useEffect(() => {
    fetchSystemStatus()
  }, [])
  
  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Bug className="h-7 w-7 text-yellow-500" />
              Hata Ayıklama Merkezi
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Son güncelleme: {lastRefresh || 'Henüz yüklenmedi'}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={fetchSystemStatus}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
            <Button
              onClick={copyAll}
              className="bg-green-600 hover:bg-green-700"
            >
              <Copy className="h-4 w-4 mr-2" />
              Tümünü Kopyala
            </Button>
            <Button
              onClick={downloadJson}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Download className="h-4 w-4 mr-2" />
              JSON İndir
            </Button>
          </div>
        </div>
        
        {/* Uyarı */}
        <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mb-6">
          <p className="text-yellow-300 text-sm">
            <strong>📋 Kullanım:</strong> "Tümünü Kopyala" butonuna basın ve çıkan veriyi bana gönderin. 
            Tüm sistem durumu, potansiyel sorunlar ve loglar tek bir metin olarak kopyalanacaktır.
          </p>
        </div>
        
        {loading && !systemStatus ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Özet */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-400" />
                Sistem Özeti
              </h2>
              
              {systemStatus?.summary && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Bekleyenler</p>
                    <p className="text-2xl font-bold text-yellow-400">{systemStatus.summary.pendingCount}</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Onaylılar</p>
                    <p className="text-2xl font-bold text-green-400">{systemStatus.summary.approvedCount}</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Reddedilenler</p>
                    <p className="text-2xl font-bold text-red-400">{systemStatus.summary.rejectedCount}</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Toplam (DB)</p>
                    <p className="text-2xl font-bold text-blue-400">{systemStatus.summary.totalInDatabase}</p>
                  </div>
                </div>
              )}
              
              {/* Environment */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Environment Variables</h3>
                <div className="space-y-1 text-sm">
                  {systemStatus?.environment && Object.entries(systemStatus.environment).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-400">{key}</span>
                      <span className={String(value).includes('✅') ? 'text-green-400' : 'text-red-400'}>
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Potansiyel Sorunlar */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                Potansiyel Sorunlar
              </h2>
              
              {systemStatus?.summary?.potentialIssues?.length > 0 ? (
                <div className="space-y-3">
                  {systemStatus.summary.potentialIssues.map((issue: any, idx: number) => (
                    <div key={idx} className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                      <p className="text-red-300 font-medium">{issue.message}</p>
                      <p className="text-red-400 text-xs mt-1">
                        Type: {issue.type} | {issue.drivers?.join(', ') || issue.emails?.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                  <p className="text-green-300 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Sorun tespit edilmedi
                  </p>
                </div>
              )}
            </div>
            
            {/* Bekleyen Sürücüler */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-yellow-400" />
                Bekleyen Sürücüler ({systemStatus?.lists?.pending?.length || 0})
              </h2>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {systemStatus?.lists?.pending?.map((driver: any) => (
                  <div key={driver.id} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{driver.name}</p>
                      <p className="text-gray-400 text-xs">{driver.email} | {driver.id}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => debugDriver(driver.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Debug
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approveDriver(driver.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Onayla
                      </Button>
                    </div>
                  </div>
                ))}
                
                {systemStatus?.lists?.pending?.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Bekleyen sürücü yok</p>
                )}
              </div>
            </div>
            
            {/* Onaylı Sürücüler */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                Onaylı Sürücüler ({systemStatus?.lists?.approved?.length || 0})
              </h2>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {systemStatus?.lists?.approved?.map((driver: any) => (
                  <div key={driver.id} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{driver.name}</p>
                        <p className="text-gray-400 text-xs">{driver.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${driver.available ? 'bg-green-600' : 'bg-gray-600'}`}>
                          {driver.available ? 'Online' : 'Offline'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${driver.approved ? 'bg-green-600' : 'bg-red-600'}`}>
                          {driver.approved ? 'Approved' : 'NOT!'}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">{driver.id}</p>
                  </div>
                ))}
                
                {systemStatus?.lists?.approved?.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Onaylı sürücü yok</p>
                )}
              </div>
            </div>
            
            {/* Frontend Logs */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 lg:col-span-2">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-400" />
                İşlem Logları
              </h2>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {frontendLogs.map((log, idx) => (
                  <div 
                    key={idx} 
                    className={`rounded-lg p-2 text-sm ${
                      log.type === 'ERROR' ? 'bg-red-900/30 text-red-300' :
                      log.type === 'SUCCESS' ? 'bg-green-900/30 text-green-300' :
                      log.type === 'DEBUG' ? 'bg-purple-900/30 text-purple-300' :
                      'bg-gray-700 text-gray-300'
                    }`}
                  >
                    <span className="text-gray-500 text-xs">[{new Date(log.timestamp).toLocaleTimeString('tr-TR')}]</span>
                    <span className="font-medium ml-2">[{log.type}]</span>
                    <span className="ml-2">{log.message}</span>
                    {log.data && (
                      <pre className="text-xs mt-1 opacity-75 overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
                
                {frontendLogs.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Henüz log yok</p>
                )}
              </div>
            </div>
            
            {/* Ham Veritabanı Verisi */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 lg:col-span-2">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-cyan-400" />
                Ham Supabase Verisi (Son 10 Kayıt)
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2 px-2">ID</th>
                      <th className="text-left py-2 px-2">İsim</th>
                      <th className="text-left py-2 px-2">Email</th>
                      <th className="text-center py-2 px-2">Approved</th>
                      <th className="text-center py-2 px-2">Available</th>
                      <th className="text-left py-2 px-2">Rejected Reason</th>
                      <th className="text-left py-2 px-2">Oluşturulma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemStatus?.supabaseDirect?.drivers?.slice(0, 10).map((driver: any) => (
                      <tr key={driver.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="py-2 px-2 text-gray-300 text-xs font-mono">{driver.id?.substring(0, 15)}...</td>
                        <td className="py-2 px-2 text-white">{driver.name}</td>
                        <td className="py-2 px-2 text-gray-400">{driver.email}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${driver.approved ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                            {String(driver.approved)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${driver.available ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'}`}>
                            {String(driver.available)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-red-400 text-xs">{driver.rejected_reason || '-'}</td>
                        <td className="py-2 px-2 text-gray-500 text-xs">{driver.created_at ? new Date(driver.created_at).toLocaleString('tr-TR') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminDebug
