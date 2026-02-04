'use client'

import Image from 'next/image';

const EquipmentSlider = () => {
  const equipmentImages = [
    {
      id: 1,
      name: 'Treadmill',
      url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center'
    },
    {
      id: 2,
      name: 'Dumbbells',
      url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&h=300&fit=crop&crop=center'
    },
    {
      id: 3,
      name: 'Barbell',
      url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop&crop=center'
    },
    {
      id: 4,
      name: 'Bench Press',
      url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center'
    },
    {
      id: 5,
      name: 'Exercise Bike',
      url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=300&fit=crop&crop=center'
    },
    {
      id: 6,
      name: 'Rowing Machine',
      url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&h=300&fit=crop&crop=center'
    },
    {
      id: 7,
      name: 'Kettlebells',
      url: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400&h=300&fit=crop&crop=center'
    },
    {
      id: 8,
      name: 'Cable Machine',
      url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center'
    },
    {
      id: 9,
      name: 'Smith Machine',
      url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop&crop=center'
    },
    {
      id: 10,
      name: 'Elliptical Trainer',
      url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=300&fit=crop&crop=center'
    }
  ];

  // Duplicate images for seamless infinite scroll
  const duplicatedImages = [...equipmentImages, ...equipmentImages];

  return (
    <section className="py-16 bg-gray-900 overflow-hidden">
      <div className="container mx-auto px-6 mb-12">
        <h2 className="text-4xl md:text-5xl font-black text-center text-white mb-4">
          Our Gym Equipment
        </h2>
        <p className="text-gray-400 text-center max-w-2xl mx-auto">
          State-of-the-art fitness equipment for all your workout needs
        </p>
      </div>

      <div className="relative">
        <div className="flex animate-scroll hover:animation-pause">
          {duplicatedImages.map((equipment, index) => (
            <div
              key={`${equipment.id}-${index}`}
              className="flex-shrink-0 w-80 h-48 mx-4 rounded-xl overflow-hidden shadow-lg bg-gray-800"
            >
              <Image
                src={equipment.url}
                alt={equipment.name}
                width={320}
                height={192}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EquipmentSlider;