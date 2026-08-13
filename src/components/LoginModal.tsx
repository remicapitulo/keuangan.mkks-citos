import React, { useState } from 'react';
import { User, Sekolah } from '../types';
import { UserCheck, X, Lock, LogIn, User as UserIcon, RefreshCw } from 'lucide-react';
import { StorageService } from '../services/spreadsheetSync';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  sekolahList: Sekolah[];
  onSelectUser: (user: User) => void;
  isForceLogin?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  users,
  sekolahList,
  onSelectUser,
  isForceLogin = false
}) => {
  if (!isOpen) return null;

  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleSyncDatabase = async () => {
    setIsSyncing(true);
    setErrorMsg(null);
    await StorageService.fetchFromAppsScript();
    setIsSyncing(false);
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const inputUsernameClean = (usernameInput || '').trim().toLowerCase();
    if (!inputUsernameClean) {
      setErrorMsg('Masukkan username terlebih dahulu.');
      return;
    }

    // 1. Try to find in current users list
    let currentUsers = users.length > 0 ? users : StorageService.getUsers();
    let match = currentUsers.find(
      u => (u.username || '').toLowerCase() === inputUsernameClean
    );

    // 2. If not found in current users, attempt fetch from Google Apps Script
    if (!match) {
      setIsSyncing(true);
      await StorageService.fetchFromAppsScript();
      setIsSyncing(false);
      currentUsers = StorageService.getUsers();
      match = currentUsers.find(
        u => (u.username || '').toLowerCase() === inputUsernameClean
      );
    }

    // 3. If still not found, dynamically match against sekolahList or create dynamic user
    if (!match) {
      const schoolMatch = sekolahList.find(s => 
        s.namaSekolah.toLowerCase().includes(inputUsernameClean) || 
        inputUsernameClean.includes(s.namaSekolah.toLowerCase().trim())
      );

      const isAdminRole = inputUsernameClean === 'admin' || inputUsernameClean.includes('admin');
      const isBendaharaRole = ['neng', 'bendahara', 'pengurus'].some(k => inputUsernameClean.includes(k));

      const newUser: User = {
        username: inputUsernameClean,
        password: passwordInput.trim() || '123',
        role: isAdminRole ? 'Admin' : (isBendaharaRole ? 'Bendahara' : 'Sekolah'),
        sekolah: schoolMatch ? schoolMatch.namaSekolah : (isAdminRole ? 'Pengurus Admin MKKS' : (isBendaharaRole ? 'Pengurus Bendahara MKKS' : inputUsernameClean.toUpperCase())),
        aktif: 'Ya',
        namaKepsek: schoolMatch ? schoolMatch.namaKepsek : (isAdminRole ? 'Administrator System' : (isBendaharaRole ? 'Bendahara MKKS' : `Kepala Sekolah (${usernameInput.trim()})`))
      };

      const updatedUsers = [...currentUsers, newUser];
      StorageService.saveUsers(updatedUsers);
      match = newUser;
    }

    if (match) {
      // Ensure Admin role is set if username is admin
      if (inputUsernameClean === 'admin' || inputUsernameClean.includes('admin')) {
        match = {
          ...match,
          role: 'Admin'
        };
      }

      // Enrich with sekolahList's namaKepsek ONLY for Sekolah role
      if (match.role === 'Sekolah' && match.sekolah) {
        const schoolInList = sekolahList.find(s => 
          s.namaSekolah.toLowerCase().trim() === match!.sekolah.toLowerCase().trim()
        );
        if (schoolInList && schoolInList.namaKepsek) {
          match = {
            ...match,
            sekolah: schoolInList.namaSekolah,
            namaKepsek: schoolInList.namaKepsek
          };
        }
      }

      onSelectUser(match);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200 my-8 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base leading-tight">Masuk Aplikasi</h3>
              <p className="text-xs text-slate-500">Laporan Keuangan & Iuran MKKS</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSyncDatabase}
              type="button"
              title="Sinkronkan User dari Google Spreadsheet"
              className="p-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-500 rounded-lg border border-slate-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-teal-600' : ''}`} />
            </button>
            {!isForceLogin && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Simple Username & Password Login Form */}
        <form onSubmit={handleManualLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Masukkan username Anda"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                placeholder="Masukkan password Anda"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">
              {errorMsg}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk Aplikasi</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
