'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Battles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      gameMode: {
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
      currentQuestion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      turnStartTime: {
        type: Sequelize.DATE,
        allowNull: true
      },
      investigationStarted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      caseFile: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      caseSolved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
    await queryInterface.dropTable('Battles');
  }
};
