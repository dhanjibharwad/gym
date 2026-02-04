'use client'

const ClassesPage = () => {
  const classes = [
    {
      id: 1,
      name: "Zumba",
      description: "High-energy dance fitness combining Latin rhythms with easy-to-follow moves",
      level: "All Levels",
      image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=300&fit=crop"
    },
    {
      id: 2,
      name: "Abs Training",
      description: "Intensive core workout targeting abdominal muscles and building strength",
      level: "Intermediate",
      image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop"
    },
    {
      id: 3,
      name: "Cardio Blast",
      description: "High-intensity cardio workout to boost endurance and burn calories",
      level: "All Levels",
      image: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&h=300&fit=crop"
    },
    {
      id: 4,
      name: "Yoga Flow",
      description: "Gentle flowing movements to improve flexibility and mindfulness",
      level: "Beginner",
      image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop"
    },
    {
      id: 5,
      name: "HIIT Training",
      description: "High-Intensity Interval Training for maximum calorie burn",
      level: "Advanced",
      image: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400&h=300&fit=crop"
    },
    {
      id: 6,
      name: "Pilates",
      description: "Low-impact exercises focusing on core strength and posture",
      level: "All Levels",
      image: "https://thecore.pilates.com/wp-content/uploads/2024/09/2409-Pilates-for-Athletes_A-Whole-Body-Approach_Core-Feature-1536x937.jpg"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <section className="py-16 bg-gradient-to-r from-gray-50 to-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-6">
            Fitness <span className="gradient-text">Classes</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join our diverse range of fitness classes designed for all levels. 
            From high-energy Zumba to focused abs training, find your perfect workout.
          </p>
        </div>
      </section>

      {/* Classes Grid */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {classes.map((classItem) => (
              <div
                key={classItem.id}
                className="rounded-2xl border-2 border-gray-200 bg-white p-6 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="mb-4">
                  <img
                    src={classItem.image}
                    alt={classItem.name}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-900">{classItem.name}</h3>
                    <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700">
                      {classItem.level}
                    </span>
                  </div>

                  <p className="text-gray-600 leading-relaxed">
                    {classItem.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ready to Start Your Fitness Journey?
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join our community and get access to all classes with our membership plans
          </p>
          {/* <button className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-blue-500 text-white font-semibold rounded-xl hover:scale-105 transition-transform duration-200">
            View Membership Plans
          </button> */}
        </div>
      </section>
    </div>
  );
};

export default ClassesPage;