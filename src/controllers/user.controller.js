import User from '../models/user.model.js';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';

export const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        'id', 'firstName', 'lastName', 'businessName', 'email',
        'phoneNumber', 'kycCompleted', 'createdAt', 'updatedAt', 'trustScore',
      ],
      include: [
        {
          model: KYC,
          as: 'kycRecords',
          attributes: [
            'phoneNumber', 'businessName', 'governmentId',
            'accountName', 'accountNumber', 'bankName', 'isVerified', 'createdAt'
          ],
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: users
    });
  } catch (error) {
    console.error('GET USERS ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: [
        'id', 'firstName', 'lastName', 'businessName', 'email',
        'isEmailVerified', 'trustScore', 'createdAt', 'updatedAt'
      ],
      include: [
        {
          model: KYC,
          as: 'kycRecords',
          attributes: [
            'phoneNumber', 'governmentId', 'accountName',
            'accountNumber', 'bankName', 'businessName', 'createdAt'
          ],
          limit: 1,
          order: [['createdAt', 'DESC']]
        },
        {
          model: Transaction,
          as: 'buyTransactions',
          include: [{ model: Escrow, as: 'escrow' }],
        },
        {
          model: Transaction,
          as: 'sellTransactions',
          include: [{ model: Escrow, as: 'escrow' }],
        }
      ],
      order: [
        [{ model: KYC, as: 'kycRecords' }, 'createdAt', 'DESC'],
        [{ model: Transaction, as: 'buyTransactions' }, 'createdAt', 'DESC'],
        [{ model: Transaction, as: 'sellTransactions' }, 'createdAt', 'DESC']
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User fetched successfully',
      data: user
    });
  } catch (error) {
    console.error('GET USER BY ID ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

export const createUser = async (userData) => {
  try {
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    const newUser = await User.create(userData);
    return newUser;
  } catch (error) {
    console.error('CREATE USER ERROR:', error);
    throw new Error('Failed to create user');
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: [
        'id', 'firstName', 'lastName', 'email', 'kycCompleted',
        'isEmailVerified', 'trustScore', 'createdAt', 'updatedAt'
      ],
      include: [
        {
          model: KYC,
          as: 'kycRecords',
          attributes: [
            'phoneNumber', 'governmentId', 'accountName',
            'accountNumber', 'bankName', 'businessName', 'createdAt'
          ],
          limit: 1,
          order: [['createdAt', 'DESC']]
        },
        {
          model: Transaction,
          as: 'buyTransactions',
          include: [{ model: Escrow, as: 'escrow' }],
        },
        {
          model: Transaction,
          as: 'sellTransactions',
          include: [{ model: Escrow, as: 'escrow' }],
        }
      ],
      order: [
        [{ model: KYC, as: 'kycRecords' }, 'createdAt', 'DESC'],
        [{ model: Transaction, as: 'buyTransactions' }, 'createdAt', 'DESC'],
        [{ model: Transaction, as: 'sellTransactions' }, 'createdAt', 'DESC']
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile fetched successfully',
      data: user
    });
  } catch (error) {
    console.error('GET PROFILE ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }

  
};

export const getScore = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['score']
    });

    return res.status(200).json({
      success: true,
      score: user.score
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateScore = async (req, res) => {
  try {
    const { points } = req.body;

    const user = await User.findByPk(req.user.id);

    user.score += points;

    await user.save();

    return res.status(200).json({
      success: true,
      score: user.score
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};