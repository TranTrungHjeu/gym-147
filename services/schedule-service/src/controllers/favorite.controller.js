/**
 * Favorite Controller
 * Handles member favorites (classes and trainers)
 */

const { prisma } = require('../lib/prisma.js');

class FavoriteController {
  /**
   * Add favorite class or trainer
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async addFavorite(req, res) {
    try {
      const { member_id } = req.params;
      const { favorite_type, favorite_id } = req.body;

      // Validate input
      if (!favorite_type || !favorite_id) {
        return res.status(400).json({
          success: false,
          message: 'favorite_type và favorite_id là bắt buộc',
          data: null,
        });
      }

      if (!['CLASS', 'TRAINER'].includes(favorite_type)) {
        return res.status(400).json({
          success: false,
          message: 'favorite_type phải là CLASS hoặc TRAINER',
          data: null,
        });
      }

      // Check if already favorited
      const existingFavorite = await prisma.memberFavorite.findUnique({
        where: {
          member_id_favorite_type_favorite_id: {
            member_id,
            favorite_type,
            favorite_id,
          },
        },
      });

      if (existingFavorite) {
        return res.status(400).json({
          success: false,
          message: 'Đã được thêm vào danh sách yêu thích',
          data: null,
        });
      }

      // Validate that the favorite exists
      if (favorite_type === 'CLASS') {
        const gymClass = await prisma.gymClass.findUnique({
          where: { id: favorite_id },
        });
        if (!gymClass) {
          return res.status(404).json({
            success: false,
            message: 'Lớp học không tồn tại',
            data: null,
          });
        }
      } else if (favorite_type === 'TRAINER') {
        const trainer = await prisma.trainer.findUnique({
          where: { id: favorite_id },
        });
        if (!trainer) {
          return res.status(404).json({
            success: false,
            message: 'Trainer không tồn tại',
            data: null,
          });
        }
      }

      // Create favorite
      const favorite = await prisma.memberFavorite.create({
        data: {
          member_id,
          favorite_type,
          favorite_id,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Đã thêm vào danh sách yêu thích',
        data: { favorite },
      });
    } catch (error) {
      console.error('Add favorite error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi thêm vào danh sách yêu thích',
        data: null,
      });
    }
  }

  /**
   * Remove favorite
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async removeFavorite(req, res) {
    try {
      const { member_id, id } = req.params;

      const favorite = await prisma.memberFavorite.findUnique({
        where: { id },
      });

      if (!favorite) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy trong danh sách yêu thích',
          data: null,
        });
      }

      if (favorite.member_id !== member_id) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa mục này',
          data: null,
        });
      }

      await prisma.memberFavorite.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Đã xóa khỏi danh sách yêu thích',
        data: null,
      });
    } catch (error) {
      console.error('Remove favorite error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi xóa khỏi danh sách yêu thích',
        data: null,
      });
    }
  }

  /**
   * Get member favorites
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMemberFavorites(req, res) {
    try {
      const { member_id } = req.params;
      const { favorite_type, page = 1, limit = 20 } = req.query;

      // Build where clause
      const whereClause = { member_id };
      if (favorite_type) {
        whereClause.favorite_type = favorite_type;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [favorites, totalCount] = await Promise.all([
        prisma.memberFavorite.findMany({
          where: whereClause,
          orderBy: { created_at: 'desc' },
          skip,
          take: parseInt(limit),
        }),
        prisma.memberFavorite.count({ where: whereClause }),
      ]);

      // Enrich favorites with details
      const enrichedFavorites = await Promise.all(
        favorites.map(async favorite => {
          let details = null;

          if (favorite.favorite_type === 'CLASS') {
            const gymClass = await prisma.gymClass.findUnique({
              where: { id: favorite.favorite_id },
              select: {
                id: true,
                name: true,
                description: true,
                category: true,
                difficulty: true,
                price: true,
                thumbnail: true,
              },
            });
            details = gymClass;
          } else if (favorite.favorite_type === 'TRAINER') {
            const trainer = await prisma.trainer.findUnique({
              where: { id: favorite.favorite_id },
              select: {
                id: true,
                full_name: true,
                bio: true,
                specializations: true,
                experience_years: true,
                rating_average: true,
                profile_photo: true,
              },
            });
            details = trainer;
          }

          return {
            ...favorite,
            details,
          };
        })
      );

      res.json({
        success: true,
        message: 'Danh sách yêu thích retrieved successfully',
        data: {
          favorites: enrichedFavorites,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error('Get member favorites error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi lấy danh sách yêu thích',
        data: null,
      });
    }
  }

  /**
   * Check if item is favorited by member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkFavorite(req, res) {
    try {
      const { member_id } = req.params;
      const { favorite_type, favorite_id } = req.query;

      if (!favorite_type || !favorite_id) {
        return res.status(400).json({
          success: false,
          message: 'favorite_type và favorite_id là bắt buộc',
          data: null,
        });
      }

      const favorite = await prisma.memberFavorite.findUnique({
        where: {
          member_id_favorite_type_favorite_id: {
            member_id,
            favorite_type,
            favorite_id,
          },
        },
      });

      res.json({
        success: true,
        message: 'Favorite status retrieved successfully',
        data: {
          is_favorited: !!favorite,
          favorite_id: favorite?.id || null,
        },
      });
    } catch (error) {
      console.error('Check favorite error:', error);
      res.status(500).json({
        success: false,
        message: 'Có lỗi xảy ra khi kiểm tra trạng thái yêu thích',
        data: null,
      });
    }
  }
}

module.exports = new FavoriteController();
