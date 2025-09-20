const { Router } = require('express');
const { MemberController } = require('../controllers/member.controller.js');

const router = Router();
const memberController = new MemberController();

// GET /members - Get all members with filters
router.get('/', memberController.getMembers.bind(memberController));

// GET /members/stats - Get member statistics
router.get('/stats', memberController.getMemberStats.bind(memberController));

// GET /members/:id - Get single member
router.get('/:id', memberController.getMember.bind(memberController));

// POST /members - Create new member
router.post('/', memberController.createMember.bind(memberController));

// PUT /members/:id - Update member
router.put('/:id', memberController.updateMember.bind(memberController));

// DELETE /members/:id - Delete member
router.delete('/:id', memberController.deleteMember.bind(memberController));

module.exports = { memberRoutes: router };