export const defaultCode =
  `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BlockConnect - Decentralized Social Network</title>
  <link href="https://unpkg.com/tailwindcss@^2/dist/tailwind.min.css" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
    body {
      font-family: 'Poppins', sans-serif;
    }
    .gradient-text {
      background: linear-gradient(90deg, #6366f1, #a855f7, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  </style>
</head>
<body class="bg-gray-900 text-gray-100 antialiased">

  <!-- Header -->
  <header class="bg-gray-800 py-4 shadow-lg">
    <div class="container mx-auto flex justify-between items-center px-6">
      <a href="#" class="text-2xl font-bold gradient-text">BlockConnect</a>
      <nav>
        <ul class="flex space-x-6">
          <li><a href="#features" class="hover:text-purple-400 transition-colors duration-300">Features</a></li>
          <li><a href="#economy" class="hover:text-purple-400 transition-colors duration-300">Economy</a></li>
          <li><a href="#control" class="hover:text-purple-400 transition-colors duration-300">Control</a></li>
          <li><a href="#join" class="bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-300">Join Now</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="py-20 text-center bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900">
    <div class="container mx-auto px-6">
      <h1 class="text-5xl md:text-6xl font-extrabold leading-tight mb-6 gradient-text">
        Decentralize Your Social Experience
      </h1>
      <p class="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
        A blockchain social network empowering users with full data control, censorship resistance, and a thriving token-based creator economy.
      </p>
      <a href="#join" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg transform hover:scale-105 transition-all duration-300">
        Start Your Journey
      </a>
    </div>
  </section>

  <!-- Features Section -->
  <section id="features" class="py-16 bg-gray-900">
    <div class="container mx-auto px-6">
      <h2 class="text-4xl font-bold text-center mb-12 gradient-text">Unleash True Freedom</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <!-- Feature 1: Data Control -->
        <div class="bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
          <div class="text-purple-500 mb-4 text-5xl">🔒</div>
          <h3 class="text-2xl font-semibold mb-3">Full Data Control</h3>
          <p class="text-gray-400">Own your data, control your privacy. You decide what to share and with whom, free from corporate harvesting.</p>
        </div>
        <!-- Feature 2: Token Economy -->
        <div id="economy" class="bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
          <div class="text-green-400 mb-4 text-5xl">💰</div>
          <h3 class="text-2xl font-semibold mb-3">Token-Based Economy</h3>
          <p class="text-gray-400">Earn tokens for creating popular content and engaging with the community. Your contributions are rewarded.</p>
        </div>
        <!-- Feature 3: Censorship Resistant -->
        <div class="bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
          <div class="text-red-400 mb-4 text-5xl">🗣️</div>
          <h3 class="text-2xl font-semibold mb-3">Censorship Resistant</h3>
          <p class="text-gray-400">Post freely without fear of arbitrary censorship. Our decentralized network protects free speech.</p>
        </div>
        <!-- Feature 4: Equitable Creator Economy -->
        <div class="bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300">
          <div class="text-yellow-400 mb-4 text-5xl">🎨</div>
          <h3 class="text-2xl font-semibold mb-3">Equitable Creator Economy</h3>
          <p class="text-gray-400">A fair distribution of value. Creators receive a larger share of rewards, fostering innovation and quality content.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- How It Works / Call to Action -->
  <section id="control" class="py-20 bg-gradient-to-br from-indigo-900 to-purple-900 text-center">
    <div class="container mx-auto px-6">
      <h2 class="text-4xl font-bold mb-8 gradient-text">How BlockConnect Empowers You</h2>
      <p class="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
        Built on cutting-edge blockchain technology, BlockConnect ensures transparency, security, and an immutable record of content and transactions. Your identity and data remain yours alone.
      </p>
      <a href="#join" class="bg-white text-purple-700 hover:bg-gray-200 font-bold py-4 px-8 rounded-full text-lg shadow-lg transform hover:scale-105 transition-all duration-300">
        Understand Decentralization
      </a>
    </div>
  </section>

  <!-- Join Section -->
  <section id="join" class="py-16 bg-gray-900">
    <div class="container mx-auto px-6 text-center">
      <h2 class="text-4xl font-bold mb-8 gradient-text">Ready to Join the Revolution?</h2>
      <p class="text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
        Step into a new era of social networking where you are the priority. Experience a platform built for freedom, fairness, and true community.
      </p>
      <button class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-12 rounded-full text-xl shadow-lg transform hover:scale-105 transition-all duration-300">
        Sign Up for BlockConnect
      </button>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-gray-800 py-8">
    <div class="container mx-auto text-center px-6">
      <p class="text-gray-400 text-sm">&copy; 2023 BlockConnect. All rights reserved. Decentralized and User-Owned.</p>
      <div class="flex justify-center space-x-6 mt-4">
        <a href="#" class="text-gray-400 hover:text-purple-400 transition-colors duration-300">Privacy Policy</a>
        <a href="#" class="text-gray-400 hover:text-purple-400 transition-colors duration-300">Terms of Service</a>
        <a href="#" class="text-gray-400 hover:text-purple-400 transition-colors duration-300">Contact Us</a>
      </div>
    </div>
  </footer>

</body>
</html>
`