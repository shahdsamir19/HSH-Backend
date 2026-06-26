'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('BattlePlayers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      battleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Battles',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      socketId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isConnected: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      xp: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      score: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hp: {
        type: Sequelize.INTEGER,
        defaultValue: 100
      },
      shield: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      combo: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      powerups: {
        type: Sequelize.TEXT,
        defaultValue: '[]'
      },
      shieldActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      answered: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      readyForInvestigation: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      answers: {
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
    await queryInterface.dropTable('BattlePlayers');
  }
};
