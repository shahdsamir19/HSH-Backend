'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('battles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      'game_mode': {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'Active'
      },
      code: {
        type: Sequelize.STRING,
        allowNull: true
      },
      turn: {
        type: Sequelize.STRING,
        allowNull: true
      },
      grid: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      'current_question': {
        type: Sequelize.TEXT,
        allowNull: true
      },
      'turn_start_time': {
        type: Sequelize.DATE,
        allowNull: true
      },
      'investigation_started': {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      'case_file': {
        type: Sequelize.TEXT,
        allowNull: true
      },
      'case_solved': {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
    await queryInterface.dropTable('battles');
  }
};
