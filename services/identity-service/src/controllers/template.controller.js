const prisma = require('../lib/prisma.js').prisma;

class TemplateController {
  /**
   * Extract variables from template content
   */
  extractVariables(content) {
    const regex = /\{\{(\w+)\}\}/g;
    const variables = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  // ==================== EMAIL TEMPLATES ====================

  /**
   * Get all email templates
   */
  async getEmailTemplates(req, res) {
    try {
      const templates = await prisma.emailTemplate.findMany({
        orderBy: {
          created_at: 'desc',
        },
      });

      res.json({
        success: true,
        message: 'Email templates retrieved successfully',
        data: templates,
      });
    } catch (error) {
      console.error('Get email templates error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy danh sách mẫu email',
        data: null,
      });
    }
  }

  /**
   * Get a single email template by ID
   */
  async getEmailTemplate(req, res) {
    try {
      const { id } = req.params;

      const template = await prisma.emailTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Email template not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Email template retrieved successfully',
        data: template,
      });
    } catch (error) {
      console.error('Get email template error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy mẫu email',
        data: null,
      });
    }
  }

  /**
   * Create a new email template
   */
  async createEmailTemplate(req, res) {
    try {
      const { name, subject, body, type, is_active } = req.body;

      if (!name || !subject || !body || !type) {
        return res.status(400).json({
          success: false,
          message: 'Name, subject, body, and type are required',
          data: null,
        });
      }

      // Extract variables from subject and body
      const subjectVars = this.extractVariables(subject);
      const bodyVars = this.extractVariables(body);
      const variables = [...new Set([...subjectVars, ...bodyVars])];

      const template = await prisma.emailTemplate.create({
        data: {
          name,
          subject,
          body,
          type,
          variables,
          is_active: is_active !== undefined ? is_active : true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Email template created successfully',
        data: template,
      });
    } catch (error) {
      console.error('Create email template error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tạo mẫu email',
        data: null,
      });
    }
  }

  /**
   * Update email template
   */
  async updateEmailTemplate(req, res) {
    try {
      const { id } = req.params;
      const { name, subject, body, type, is_active } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (subject !== undefined) updateData.subject = subject;
      if (body !== undefined) updateData.body = body;
      if (type !== undefined) updateData.type = type;
      if (is_active !== undefined) updateData.is_active = is_active;

      // Re-extract variables if subject or body changed
      if (subject !== undefined || body !== undefined) {
        const currentTemplate = await prisma.emailTemplate.findUnique({
          where: { id },
        });
        const finalSubject = subject !== undefined ? subject : currentTemplate.subject;
        const finalBody = body !== undefined ? body : currentTemplate.body;
        const subjectVars = this.extractVariables(finalSubject);
        const bodyVars = this.extractVariables(finalBody);
        updateData.variables = [...new Set([...subjectVars, ...bodyVars])];
      }

      const template = await prisma.emailTemplate.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'Email template updated successfully',
        data: template,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Email template not found',
          data: null,
        });
      }

      console.error('Update email template error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi cập nhật mẫu email',
        data: null,
      });
    }
  }

  /**
   * Delete email template
   */
  async deleteEmailTemplate(req, res) {
    try {
      const { id } = req.params;

      await prisma.emailTemplate.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Email template deleted successfully',
        data: null,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Email template not found',
          data: null,
        });
      }

      console.error('Delete email template error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi xóa mẫu email',
        data: null,
      });
    }
  }

  // ==================== SMS TEMPLATES ====================

  /**
   * Get all SMS templates
   */
  async getSMSTemplates(req, res) {
    try {
      const templates = await prisma.sMSTemplate.findMany({
        orderBy: {
          created_at: 'desc',
        },
      });

      res.json({
        success: true,
        message: 'SMS templates retrieved successfully',
        data: templates,
      });
    } catch (error) {
      console.error('Get SMS templates error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy danh sách mẫu SMS',
        data: null,
      });
    }
  }

  /**
   * Get a single SMS template by ID
   */
  async getSMSTemplate(req, res) {
    try {
      const { id } = req.params;

      const template = await prisma.sMSTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'SMS template not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'SMS template retrieved successfully',
        data: template,
      });
    } catch (error) {
      console.error('Get SMS template error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy mẫu SMS',
        data: null,
      });
    }
  }

  /**
   * Create a new SMS template
   */
  async createSMSTemplate(req, res) {
    try {
      const { name, message, type, is_active } = req.body;

      if (!name || !message || !type) {
        return res.status(400).json({
          success: false,
          message: 'Name, message, and type are required',
          data: null,
        });
      }

      // Extract variables from message
      const variables = this.extractVariables(message);

      const template = await prisma.sMSTemplate.create({
        data: {
          name,
          message,
          type,
          variables,
          is_active: is_active !== undefined ? is_active : true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'SMS template created successfully',
        data: template,
      });
    } catch (error) {
      console.error('Create SMS template error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi tạo mẫu SMS',
        data: null,
      });
    }
  }

  /**
   * Update SMS template
   */
  async updateSMSTemplate(req, res) {
    try {
      const { id } = req.params;
      const { name, message, type, is_active } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (message !== undefined) {
        updateData.message = message;
        // Re-extract variables
        updateData.variables = this.extractVariables(message);
      }
      if (type !== undefined) updateData.type = type;
      if (is_active !== undefined) updateData.is_active = is_active;

      const template = await prisma.sMSTemplate.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        message: 'SMS template updated successfully',
        data: template,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'SMS template not found',
          data: null,
        });
      }

      console.error('Update SMS template error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi cập nhật mẫu SMS',
        data: null,
      });
    }
  }

  /**
   * Delete SMS template
   */
  async deleteSMSTemplate(req, res) {
    try {
      const { id } = req.params;

      await prisma.sMSTemplate.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'SMS template deleted successfully',
        data: null,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'SMS template not found',
          data: null,
        });
      }

      console.error('Delete SMS template error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi xóa mẫu SMS',
        data: null,
      });
    }
  }

  /**
   * Render template with variables (helper method)
   */
  renderTemplate(template, variables) {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, value || '');
    }
    return rendered;
  }
}

module.exports = new TemplateController();

