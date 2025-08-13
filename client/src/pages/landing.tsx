import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, Clock, MapPin, Star, TrendingDown, Leaf, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50 dark:from-green-950 dark:to-orange-950">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Looper</h1>
          </div>
          <Button 
            onClick={() => window.location.href = '/api/login'} 
            className="bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-login"
          >
            Get Started
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Rescue Food, Save Money, Help Planet
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Connect with local restaurants, hotels, and bakeries to buy surplus food at amazing discounts.
            Reduce food waste while enjoying great meals at unbeatable prices.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4"
              data-testid="button-get-started"
            >
              Start Saving Food Today
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
              data-testid="button-for-businesses"
            >
              For Businesses
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <TrendingDown className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <CardTitle className="text-3xl font-bold text-green-600">30-70%</CardTitle>
              <CardDescription>Average discount on surplus food</CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center">
            <CardHeader>
              <Leaf className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <CardTitle className="text-3xl font-bold text-green-600">1.2kg</CardTitle>
              <CardDescription>CO2 saved per meal rescued</CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center">
            <CardHeader>
              <Users className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <CardTitle className="text-3xl font-bold text-green-600">50+</CardTitle>
              <CardDescription>Partner businesses ready to serve</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            How Looper Works
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Discover Nearby</CardTitle>
                <CardDescription>
                  Find restaurants, bakeries, and cafes near you with surplus food available at discounted prices.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-lg flex items-center justify-center mb-4">
                  <Utensils className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Order & Pay</CardTitle>
                <CardDescription>
                  Browse available items, choose your favorites, and pay securely through the app with your wallet or card.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Pickup & Enjoy</CardTitle>
                <CardDescription>
                  Collect your food during the specified pickup window and enjoy delicious meals while helping the planet.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Sample Food Cards */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Available Right Now
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg" data-testid="text-sample-food-1">Baker's Dozen Surprise</CardTitle>
                    <CardDescription>Fresh Bread Boutique</CardDescription>
                  </div>
                  <Badge className="bg-green-100 text-green-800">50% off</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="text-2xl font-bold text-green-600">₦2,500</span>
                    <span className="text-sm text-gray-500 line-through ml-2">₦5,000</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">4.8</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">Mixed pastries, bread, and baked goods</p>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>Pickup: 6:00 PM - 8:00 PM</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg" data-testid="text-sample-food-2">Chef's Special Box</CardTitle>
                    <CardDescription>Mama's Kitchen</CardDescription>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">40% off</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="text-2xl font-bold text-green-600">₦3,600</span>
                    <span className="text-sm text-gray-500 line-through ml-2">₦6,000</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">4.6</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">Complete meal with rice, protein, and sides</p>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>Pickup: 7:30 PM - 9:00 PM</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg" data-testid="text-sample-food-3">Café Mystery Bag</CardTitle>
                    <CardDescription>Urban Coffee House</CardDescription>
                  </div>
                  <Badge className="bg-red-100 text-red-800">60% off</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="text-2xl font-bold text-green-600">₦1,200</span>
                    <span className="text-sm text-gray-500 line-through ml-2">₦3,000</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">4.9</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">Sandwiches, coffee, and pastries</p>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>Pickup: 5:00 PM - 7:00 PM</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Impact Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Your Impact Matters
          </h3>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Join the Fight Against Food Waste
              </h4>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Every meal you rescue through Looper helps reduce food waste in Nigeria. 
                Together, we're building a more sustainable food system where good food gets to 
                people instead of landfills.
              </p>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-center">
                  <Leaf className="w-5 h-5 text-green-600 mr-2" />
                  Reduce greenhouse gas emissions
                </li>
                <li className="flex items-center">
                  <TrendingDown className="w-5 h-5 text-green-600 mr-2" />
                  Save money on quality food
                </li>
                <li className="flex items-center">
                  <Users className="w-5 h-5 text-green-600 mr-2" />
                  Support local businesses
                </li>
              </ul>
            </div>
            <div className="text-center">
              <div className="inline-block p-8 bg-green-100 dark:bg-green-800 rounded-full mb-4">
                <Leaf className="w-16 h-16 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Start your impact journey today
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Start Saving?
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Join thousands of users already making a difference with every meal.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            className="bg-green-600 hover:bg-green-700 text-white px-12 py-4"
            data-testid="button-join-now"
          >
            Join Looper Now
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2024 Looper. Fighting food waste, one meal at a time.</p>
        </div>
      </footer>
    </div>
  );
}