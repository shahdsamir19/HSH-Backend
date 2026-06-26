'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('battle_players', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      'battle_id': {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'battles',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      'user_id': {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      'socket_id': {
        type: Sequelize.STRING,
        allowNull: true
      },
      'is_connected': {
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
      'shield_active': {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      answered: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      'ready_for_investigation': {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      answers: {
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
    await queryInterface.dropTable('battle_players');
  }
};
