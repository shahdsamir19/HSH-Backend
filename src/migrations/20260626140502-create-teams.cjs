'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Teams', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      roomCode: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      missionName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'Lobby'
      },
      score: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      progress: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      objectives: {
        type: Sequelize.TEXT,
        defaultValue: '[]'
      },
      clues: {
        type: Sequelize.TEXT,
        defaultValue: '[]'
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
    await queryInterface.dropTable('Teams');
  }
};
