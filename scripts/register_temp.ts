import { authService } from '../server/services/authService';

async function registerBusiness() {
  try {
    const result = await authService.registerBusinessOwner({
      email: "testbusiness2@example.com",
      password: "password123",
      fullName: "Test Business Owner 2",
      businessName: "The Second Place",
      businessType: "restaurant",
      address: "456 Another St, Anytown, USA",
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error registering business owner:', error);
  }
}

registerBusiness();