export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-500">&copy; {currentYear} ExamShare. All rights reserved.</p>
          </div>
          <div className="mt-4 flex justify-center md:mt-0">
            <div className="text-sm text-gray-500">
              <a href="#" className="text-gray-500 hover:text-gray-700 mr-4">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700 mr-4">
                Terms of Service
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700">
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
