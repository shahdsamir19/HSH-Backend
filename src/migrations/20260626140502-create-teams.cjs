'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('teams', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      'room_code': {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      'mission_name': {
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
      'created_at': {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      'updated_at': {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('teams');
  }
};
