import { businessService } from '../server/services/businessService';

async function createBusiness() {
  try {
    const userId = "22ec5c0a-d5cb-4859-948c-e7b6647832cc"; // User ID from previous registration
    const businessData = {
      businessName: "The Third Place",
      address: "789 New St, Anytown, USA",
      businessType: "restaurant",
    };
    const business = await businessService.createBusiness(userId, businessData);
    console.log(JSON.stringify(business, null, 2));
  } catch (error) {
    console.error('Error creating business:', error);
  }
}

createBusiness();