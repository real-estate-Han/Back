import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    itemUniqueID: { type: Number, required: true },
    itemAddress: { type: String, required: true },
    itemGeoLocation: [{ type: Number, required: true }],
    itemType: { type: String, required: true },
    itemDeposit: { type: Number },
    itemMonthly: { type: Number },
    itemJense: { type: Number },
    itemSale: { type: Number },
    itemManagement: { type: Number },
    itemAreaLand: { type: Number },
    itemParking: { type: String },
    itemElevator: { type: String },
    itemHeating: { type: String },
    itemBalcony: { type: String },
    itemDirection: { type: String },
    itemAreaBuilding: { type: Number },
    itemFloor: { type: Number },
    itemPurpose: { type: String },
    itemRooms: { type: String },
    itemStatus: { type: String },
    itemLandNumber: { type: String },
    itemMovein: { type: String },
    itemApproval: { type: String },
    itemSubway: { type: String },
    itemTitleimg: { type: String },
    itemDetailimg: [{ type: String }],
    itemTag: [{ type: String }],
    itemTruck: { type: String },
    itemAreaTotal: { type: Number },
    itemLandCategory: { type: String },
    itemElectricity: { type: Number },
    itemTotalAreaLand: { type: Number },
    itemFloorHeight: { type: Number },
    itemSupplyArea: { type: Number },
    itemLandType: { type: String },
    itemExclusiveArea: { type: Number },
    itemOption: { type: String },

    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const Post = mongoose.model('Post', postSchema);
export default Post;
