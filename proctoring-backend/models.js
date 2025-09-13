import { DataTypes, Model } from 'sequelize';
import sequelize from './db.js'; 
class ProctoringSession extends Model {}
ProctoringSession.init({
  candidateName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  endTime: {
    type: DataTypes.DATE,
  },
  finalIntegrityScore: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
  }
}, {
  sequelize,
  modelName: 'proctoringSession',
});

class EventLog extends Model {}
EventLog.init({
  eventType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  deduction: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  modelName: 'eventLog',
  timestamps: false,
});

// Associations
ProctoringSession.hasMany(EventLog, { as: 'events', foreignKey: 'sessionId', onDelete: 'CASCADE' });
EventLog.belongsTo(ProctoringSession, { foreignKey: 'sessionId' });

export { sequelize, ProctoringSession, EventLog };