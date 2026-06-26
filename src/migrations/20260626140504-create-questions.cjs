'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Questions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      options: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      correctAnswer: {
        type: Sequelize.STRING,
        allowNull: false
      },
      clue: {
        type: Sequelize.STRING,
        allowNull: true
      },
      points: {
        type: Sequelize.INTEGER,
        defaultValue: 10
      },
      gameMode: {
        type: Sequelize.STRING,
        allowNull: false
      },
      authorId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Questions');
  }
};
