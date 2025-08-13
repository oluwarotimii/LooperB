import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, MapPin, Clock, Star, User, LogOut } from "lucide-react";

export default function Home() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Looper</h1>
              <Badge variant="secondary" className="text-green-600" data-testid="badge-welcome">
                Welcome back!
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-gray-900 dark:text-white" data-testid="text-user-name">
                  {user?.fullName || 'User'}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/api/logout'}
                className="flex items-center space-x-2"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Hello, {user?.firstName || 'there'}! 👋
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Ready to rescue some delicious food and help the planet?
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Your Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 mb-1" data-testid="text-meals-rescued">12</div>
              <p className="text-sm text-gray-600">Meals rescued</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Money Saved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 mb-1" data-testid="text-money-saved">₦8,450</div>
              <p className="text-sm text-gray-600">Total savings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">CO2 Prevented</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 mb-1" data-testid="text-co2-saved">14.4kg</div>
              <p className="text-sm text-gray-600">Carbon footprint</p>
            </CardContent>
          </Card>
        </div>

        {/* Available Food Listings */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Available Near You
            </h3>
            <Button variant="outline" data-testid="button-view-all">
              View All
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" data-testid="card-food-listing-1">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Artisan Bread Bundle</CardTitle>
                    <CardDescription>The Bread Factory</CardDescription>
                  </div>
                  <Badge className="bg-green-100 text-green-800">45% off</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="text-2xl font-bold text-green-600">₦2,750</span>
                    <span className="text-sm text-gray-500 line-through ml-2">₦5,000</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">4.7</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">Fresh sourdough, croissants, and pastries</p>
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>1.2 km away</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>Pickup: 6:00 PM - 8:00 PM</span>
                </div>
                <Button className="w-full mt-4 bg-green-600 hover:bg-green-700" data-testid="button-order-1">
                  Order Now
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" data-testid="card-food-listing-2">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Nigerian Feast Box</CardTitle>
                    <CardDescription>Bukka Restaurant</CardDescription>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">50% off</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="text-2xl font-bold text-green-600">₦3,000</span>
                    <span className="text-sm text-gray-500 line-through ml-2">₦6,000</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">4.9</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">Jollof rice, grilled chicken, plantain, salad</p>
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>0.8 km away</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>Pickup: 7:00 PM - 9:00 PM</span>
                </div>
                <Button className="w-full mt-4 bg-green-600 hover:bg-green-700" data-testid="button-order-2">
                  Order Now
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" data-testid="card-food-listing-3">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Café Surprise Bag</CardTitle>
                    <CardDescription>Corner Coffee</CardDescription>
                  </div>
                  <Badge className="bg-red-100 text-red-800">65% off</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="text-2xl font-bold text-green-600">₦1,050</span>
                    <span className="text-sm text-gray-500 line-through ml-2">₦3,000</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">4.5</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">Coffee, sandwiches, muffins, cookies</p>
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>2.1 km away</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>Pickup: 5:30 PM - 7:30 PM</span>
                </div>
                <Button className="w-full mt-4 bg-green-600 hover:bg-green-700" data-testid="button-order-3">
                  Order Now
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Recent Activity
          </h3>
          
          <div className="space-y-4">
            <Card data-testid="card-recent-order-1">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                    <Utensils className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Pizza Corner Special</h4>
                    <p className="text-sm text-gray-600">Completed • 2 days ago</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">₦2,800</p>
                  <p className="text-sm text-green-600">Saved ₦1,200</p>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-recent-order-2">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-full flex items-center justify-center">
                    <Utensils className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Bakery Mystery Box</h4>
                    <p className="text-sm text-gray-600">Completed • 5 days ago</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">₦1,500</p>
                  <p className="text-sm text-green-600">Saved ₦2,500</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}