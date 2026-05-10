'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },

      firstName: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      lastName: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      businessName: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },

      phoneNumber: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },

      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      governmentId: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      isEmailVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },

      role: {
        type: Sequelize.ENUM('buyer', 'seller', 'admin'),
        defaultValue: 'buyer',
      },

      trustScore: {
        type: Sequelize.INTEGER,
        defaultValue: 100,
        allowNull: false,
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
