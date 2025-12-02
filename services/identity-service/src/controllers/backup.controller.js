const prisma = require('../lib/prisma.js').prisma;
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class BackupController {
  /**
   * Get all backups
   */
  async getBackups(req, res) {
    try {
      const backups = await prisma.backup.findMany({
        orderBy: {
          created_at: 'desc',
        },
      });

      res.json({
        success: true,
        message: 'Backups retrieved successfully',
        data: backups,
      });
    } catch (error) {
      console.error('Get backups error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy danh sách backup',
        data: null,
      });
    }
  }

  /**
   * Get a single backup by ID
   */
  async getBackup(req, res) {
    try {
      const { id } = req.params;

      const backup = await prisma.backup.findUnique({
        where: { id },
      });

      if (!backup) {
        return res.status(404).json({
          success: false,
          message: 'Backup not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Backup retrieved successfully',
        data: backup,
      });
    } catch (error) {
      console.error('Get backup error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy backup',
        data: null,
      });
    }
  }

  /**
   * Get backup status
   */
  async getBackupStatus(req, res) {
    try {
      const { id } = req.params;

      const backup = await prisma.backup.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          size: true,
          error_message: true,
          created_at: true,
          completed_at: true,
        },
      });

      if (!backup) {
        return res.status(404).json({
          success: false,
          message: 'Backup not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Backup status retrieved successfully',
        data: backup,
      });
    } catch (error) {
      console.error('Get backup status error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy trạng thái backup',
        data: null,
      });
    }
  }

  /**
   * Create a new backup
   */
  async createBackup(req, res) {
    try {
      const { name, type } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          success: false,
          message: 'Name and type are required',
          data: null,
        });
      }

      // Create backup record
      const backup = await prisma.backup.create({
        data: {
          name,
          type,
          status: 'PENDING',
        },
      });

      // Start backup process asynchronously
      this.performBackup(backup.id, type).catch(error => {
        console.error('Backup process error:', error);
      });

      res.status(201).json({
        success: true,
        message: 'Backup process started',
        data: backup,
      });
    } catch (error) {
      console.error('Create backup error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tạo backup',
        data: null,
      });
    }
  }

  /**
   * Perform backup (async)
   */
  async performBackup(backupId, type) {
    try {
      // Update status to IN_PROGRESS
      await prisma.backup.update({
        where: { id: backupId },
        data: { status: 'IN_PROGRESS' },
      });

      const backupDir = path.join(process.cwd(), 'backups');
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-${backupId}-${timestamp}.sql`;
      const backupPath = path.join(backupDir, backupFileName);

      // Get database URL from environment
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      // Extract database connection details
      const url = new URL(databaseUrl.replace('postgresql://', 'http://'));
      const dbHost = url.hostname;
      const dbPort = url.port || 5432;
      const dbName = url.pathname.slice(1);
      const dbUser = url.username;
      const dbPassword = url.password;

      // Create pg_dump command
      const pgDumpCmd = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F c -f "${backupPath}"`;

      // Execute backup
      await execAsync(pgDumpCmd);

      // Get file size
      const stats = await fs.stat(backupPath);
      const fileSize = stats.size;

      // Update backup record
      await prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'COMPLETED',
          size: fileSize,
          file_path: backupPath,
          completed_at: new Date(),
        },
      });
    } catch (error) {
      console.error('Backup process error:', error);
      await prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'FAILED',
          error_message: error.message || 'Backup failed',
        },
      });
    }
  }

  /**
   * Download backup file
   */
  async downloadBackup(req, res) {
    try {
      const { id } = req.params;

      const backup = await prisma.backup.findUnique({
        where: { id },
      });

      if (!backup) {
        return res.status(404).json({
          success: false,
          message: 'Backup not found',
        });
      }

      if (backup.status !== 'COMPLETED' || !backup.file_path) {
        return res.status(400).json({
          success: false,
          message: 'Backup is not ready for download',
        });
      }

      // Check if file exists
      try {
        await fs.access(backup.file_path);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'Backup file not found',
        });
      }

      // Send file
      res.download(backup.file_path, `${backup.name}.sql`, (err) => {
        if (err) {
          console.error('Download error:', err);
          res.status(500).json({
            success: false,
            message: 'Error downloading backup file',
          });
        }
      });
    } catch (error) {
      console.error('Download backup error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tải backup',
      });
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(req, res) {
    try {
      const { backup_id, restore_type, tables } = req.body;

      if (!backup_id) {
        return res.status(400).json({
          success: false,
          message: 'Backup ID is required',
        });
      }

      const backup = await prisma.backup.findUnique({
        where: { id: backup_id },
      });

      if (!backup) {
        return res.status(404).json({
          success: false,
          message: 'Backup not found',
        });
      }

      if (backup.status !== 'COMPLETED' || !backup.file_path) {
        return res.status(400).json({
          success: false,
          message: 'Backup is not ready for restore',
        });
      }

      // Check if file exists
      try {
        await fs.access(backup.file_path);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'Backup file not found',
        });
      }

      // Start restore process asynchronously
      this.performRestore(backup.file_path, restore_type, tables).catch(error => {
        console.error('Restore process error:', error);
      });

      res.json({
        success: true,
        message: 'Restore process started',
        data: {
          status: 'IN_PROGRESS',
          message: 'Restore is being processed in the background',
        },
      });
    } catch (error) {
      console.error('Restore backup error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi khôi phục backup',
      });
    }
  }

  /**
   * Perform restore (async)
   */
  async performRestore(filePath, restoreType, tables) {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      const url = new URL(databaseUrl.replace('postgresql://', 'http://'));
      const dbHost = url.hostname;
      const dbPort = url.port || 5432;
      const dbName = url.pathname.slice(1);
      const dbUser = url.username;
      const dbPassword = url.password;

      // Create pg_restore command
      const pgRestoreCmd = `PGPASSWORD="${dbPassword}" pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --clean --if-exists "${filePath}"`;

      // Execute restore
      await execAsync(pgRestoreCmd);

      console.log('Restore completed successfully');
    } catch (error) {
      console.error('Restore process error:', error);
      throw error;
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(req, res) {
    try {
      const { id } = req.params;

      const backup = await prisma.backup.findUnique({
        where: { id },
      });

      if (!backup) {
        return res.status(404).json({
          success: false,
          message: 'Backup not found',
        });
      }

      // Delete file if exists
      if (backup.file_path) {
        try {
          await fs.unlink(backup.file_path);
        } catch (error) {
          console.error('Error deleting backup file:', error);
          // Continue with database deletion even if file deletion fails
        }
      }

      // Delete database record
      await prisma.backup.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Backup deleted successfully',
        data: null,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Backup not found',
        });
      }

      console.error('Delete backup error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi xóa backup',
        data: null,
      });
    }
  }
}

module.exports = new BackupController();

