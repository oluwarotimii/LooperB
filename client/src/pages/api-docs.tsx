import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Code, Database, Shield, Zap, Users } from "lucide-react";

export default function ApiDocs() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="title-api-docs">
                Looper API Documentation
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Comprehensive REST API for the sustainable food redistribution platform
              </p>
            </div>
            <Button 
              onClick={() => window.open('/api/docs', '_blank')}
              className="flex items-center space-x-2"
              data-testid="button-swagger-ui"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Swagger UI</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg">50+ Endpoints</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Comprehensive API coverage</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-green-600" />
                <CardTitle className="text-lg">9 Services</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Modular service architecture</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-red-600" />
                <CardTitle className="text-lg">OAuth 2.0</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Secure authentication</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                <CardTitle className="text-lg">Real-time</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">WebSocket messaging</p>
            </CardContent>
          </Card>
        </div>

        {/* API Endpoint Categories */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Authentication */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span>Authentication</span>
                <Badge variant="secondary">4 endpoints</Badge>
              </CardTitle>
              <CardDescription>
                User authentication and session management using Replit OAuth
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">GET /api/auth/user</p>
                  <p className="text-xs text-gray-600">Get current user profile</p>
                </div>
                <Badge className="bg-green-100 text-green-800">200</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">GET /api/login</p>
                  <p className="text-xs text-gray-600">Initiate OAuth flow</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800">302</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">GET /api/logout</p>
                  <p className="text-xs text-gray-600">End user session</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800">302</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-green-600" />
                <span>User Management</span>
                <Badge variant="secondary">8 endpoints</Badge>
              </CardTitle>
              <CardDescription>
                User profiles, favorites, and personal data management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">GET /api/users/{id}</p>
                  <p className="text-xs text-gray-600">Get user profile</p>
                </div>
                <Badge className="bg-green-100 text-green-800">200</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">PUT /api/users/{id}</p>
                  <p className="text-xs text-gray-600">Update profile</p>
                </div>
                <Badge className="bg-green-100 text-green-800">200</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">GET /api/users/{id}/favorites</p>
                  <p className="text-xs text-gray-600">Get user favorites</p>
                </div>
                <Badge className="bg-green-100 text-green-800">200</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Businesses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-purple-600" />
                <span>Business Management</span>
                <Badge variant="secondary">12 endpoints</Badge>
              </CardTitle>
              <CardDescription>
                Business registration, profiles, and analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">GET /api/businesses</p>
                  <p className="text-xs text-gray-600">List all businesses</p>
                </div>
                <Badge className="bg-green-100 text-green-800">200</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">POST /api/businesses</p>
                  <p className="text-xs text-gray-600">Create business</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800">201</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">GET /api/businesses/{id}/analytics</p>
                  <p className="text-xs text-gray-600">Business analytics</p>
                </div>
                <Badge className="bg-green-100 text-green-800">200</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Food Listings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-orange-600" />
                <span>Food Listings</span>
                <Badge variant="secondary">10 endpoints</Badge>
              </CardTitle>
              <CardDescription>
                Food item management and availability tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">GET /api/listings</p>
                  <p className="text-xs text-gray-600">Search food listings</p>
                </div>
                <Badge className="bg-green-100 text-green-800">200</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">POST /api/businesses/{id}/listings</p>
                  <p className="text-xs text-gray-600">Create listing</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800">201</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">PUT /api/listings/{id}</p>
                  <p className="text-xs text-gray-600">Update listing</p>
                </div>
                <Badge className="bg-green-100 text-green-800">200</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-red-600" />
                <span>Order Management</span>
                <Badge variant="secondary">8 endpoints</Badge>
              </CardTitle>
              <CardDescription>
                Order processing, fulfillment, and pickup verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">POST /api/orders</p>
                  <p className="text-xs text-gray-600">Create new order</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800">201</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">GET /api/orders</p>
                  <p className="text-xs text-gray-600">Get user orders</p>
                </div>
                <Badge className="bg-green-100 text-green-800">200</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">POST /api/orders/{id}/verify-pickup</p>
                  <p className="text-xs text-gray-600">Verify with QR code</p>
                </div>
                <Badge className="bg-green-100 text-green-800">200</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Payments & Wallet */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-600" />
                <span>Payments & Wallet</span>
                <Badge variant="secondary">6 endpoints</Badge>
              </CardTitle>
              <CardDescription>
                Payment processing and digital wallet management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">GET /api/wallet/balance</p>
                  <p className="text-xs text-gray-600">Get wallet balance</p>
                </div>
                <Badge className="bg-green-100 text-green-800">200</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">GET /api/wallet/transactions</p>
                  <p className="text-xs text-gray-600">Transaction history</p>
                </div>
                <Badge className="bg-green-100 text-green-800">200</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">POST /api/payments/process</p>
                  <p className="text-xs text-gray-600">Process payment</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800">201</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documentation Links */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Documentation</CardTitle>
              <CardDescription>
                Explore and test API endpoints directly in your browser
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={() => window.open('/api/docs', '_blank')}
                  className="w-full flex items-center justify-center space-x-2"
                  data-testid="button-swagger-docs"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Swagger UI</span>
                </Button>
                <p className="text-sm text-gray-600">
                  Complete OpenAPI 3.0 specification with request/response examples
                  and interactive testing capabilities.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Technical Documentation</CardTitle>
              <CardDescription>
                Comprehensive system architecture and implementation details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('/api/docs.json', '_blank')}
                    className="text-xs"
                    data-testid="button-openapi-json"
                  >
                    OpenAPI JSON
                  </Button>
                  <Button 
                    variant="outline"
                    className="text-xs"
                    data-testid="button-trd"
                  >
                    View TRD
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Access raw OpenAPI specification and detailed Technical Requirements
                  Document with system architecture details.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* WebSocket Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              <span>Real-time WebSocket API</span>
            </CardTitle>
            <CardDescription>
              WebSocket connection for real-time messaging and notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Connection Endpoint</h4>
                <code className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded text-sm">
                  wss://your-domain.replit.app/ws
                </code>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Supported Events</h4>
                <ul className="text-sm space-y-1">
                  <li>• <code>message</code> - Real-time messaging</li>
                  <li>• <code>order_update</code> - Order status changes</li>
                  <li>• <code>notification</code> - System notifications</li>
                  <li>• <code>presence</code> - User online/offline status</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}