import mongoose, { Schema, Document } from 'mongoose';

export interface ILeavePlan extends Document {
  userId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  reason: string;
  createdAt: Date;
}

const LeavePlanSchema = new Schema<ILeavePlan>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export const LeavePlan = mongoose.models.LeavePlan || mongoose.model<ILeavePlan>('LeavePlan', LeavePlanSchema);
