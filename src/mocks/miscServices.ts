import type { User, ActivityLog, Settings, Notification, BackupRecord } from '@/types';
import type { UserService, ActivityLogService, SettingsService, NotificationService, BackupService } from '@/services/types';
import { mockUsers, mockActivityLogs, mockNotifications, mockBackups, defaultSettings } from '@/mocks/data';
import { delay, uid, clone, persistentStore, persistentValue } from '@/mocks/helpers';

class MockUserService implements UserService {
  private usersStore = persistentStore<User>('users', mockUsers);
  private get users(): User[] { return this.usersStore.items; }
  private set users(v: User[]) { this.usersStore.items = v; }

  async list(): Promise<User[]> {
    return delay([...this.users]);
  }

  async create(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = { ...data, id: uid('u'), createdAt: new Date().toISOString() };
    this.users.unshift(user);
    return delay(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('Utilisateur introuvable');
    this.users[idx] = { ...this.users[idx], ...data };
    return delay(this.users[idx]);
  }

  async remove(id: string): Promise<void> {
    this.users = this.users.filter((u) => u.id !== id);
    return delay(undefined);
  }
}

class MockActivityLogService implements ActivityLogService {
  private logsStore = persistentStore<ActivityLog>('logs', mockActivityLogs);
  private get logs(): ActivityLog[] { return this.logsStore.items; }
  private set logs(v: ActivityLog[]) { this.logsStore.items = v; }

  async list(): Promise<ActivityLog[]> {
    return delay([...this.logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
  }

  log(entry: Omit<ActivityLog, 'id' | 'timestamp'>): void {
    this.logs.unshift({ ...entry, id: uid('a'), timestamp: new Date().toISOString() });
  }
}

class MockSettingsService implements SettingsService {
  private settingsStore = persistentValue<Settings>('settings', defaultSettings);
  private get settings(): Settings { return this.settingsStore.value; }
  private set settings(v: Settings) { this.settingsStore.value = v; }

  async get(): Promise<Settings> {
    return delay(clone(this.settings));
  }

  async update(data: Partial<Settings>): Promise<Settings> {
    this.settings = { ...this.settings, ...data };
    return delay(clone(this.settings));
  }
}

class MockNotificationService implements NotificationService {
  private notificationsStore = persistentStore<Notification>('notifications', mockNotifications);
  private get notifications(): Notification[] { return this.notificationsStore.items; }
  private set notifications(v: Notification[]) { this.notificationsStore.items = v; }

  async list(): Promise<Notification[]> {
    return delay([...this.notifications].sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
  }

  async markRead(id: string): Promise<void> {
    const n = this.notifications.find((x) => x.id === id);
    if (n) n.read = true;
    return delay(undefined);
  }

  async markAllRead(): Promise<void> {
    this.notifications.forEach((n) => (n.read = true));
    return delay(undefined);
  }
}

class MockBackupService implements BackupService {
  private backupsStore = persistentStore<BackupRecord>('backups', mockBackups);
  private get backups(): BackupRecord[] { return this.backupsStore.items; }
  private set backups(v: BackupRecord[]) { this.backupsStore.items = v; }

  async list(): Promise<BackupRecord[]> {
    return delay([...this.backups].sort((a, b) => b.date.localeCompare(a.date)));
  }

  async createManual(): Promise<BackupRecord> {
    const backup: BackupRecord = {
      id: uid('b'),
      date: new Date().toISOString(),
      type: 'manuel',
      size: '2.4 Mo',
      location: 'C:\\Factura\\backups\\',
    };
    this.backups.unshift(backup);
    return delay(backup);
  }

  async restore(_id: string): Promise<void> {
    return delay(undefined, 500);
  }
}

export const userService = new MockUserService();
export const activityLogService = new MockActivityLogService();
export const settingsService = new MockSettingsService();
export const notificationService = new MockNotificationService();
export const backupService = new MockBackupService();