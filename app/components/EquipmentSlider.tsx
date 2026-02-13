'use client'

import Image from 'next/image';

const EquipmentSlider = () => {
  const equipmentImages = [
    {
      id: 1,
      name: 'Treadmill',
      url: 'https://lh3.googleusercontent.com/p/AF1QipOHH1Ef1Jb3uajThEDJ3oC_lFntwHt4xQ1QRebH=s680-w680-h510-rw'
    },
    {
      id: 2,
      name: 'Dumbbells',
      url: 'https://lh3.googleusercontent.com/p/AF1QipOZnvePtZgzPCW5vyKaVRa1zKdtCYaiYHmQpXkO=s680-w680-h510-rw'
    },
    {
      id: 3,
      name: 'Barbell',
      url: 'https://lh3.googleusercontent.com/gps-cs-s/AHVAweoSg6ABKFmFGBhsNOHpJ2KFQCEM5BQV3uhOY4Tf88CIF7eqVCLcLsgZF5zJHh4rMuEsxi-frZla5GxKC3h1EGdRmNfOLbb77EYSnXOAq6FKc-iG6v3qf7stTHePW973QxbGptwtm7zAHpw=s680-w680-h510-rw'
    },
    {
      id: 4,
      name: 'Bench Press',
      url: 'https://lh3.googleusercontent.com/p/AF1QipODBeWt2BTcqfkFjCZGrK7axIugUQ8epzSefHh1=s680-w680-h510-rw'
    },
    {
      id: 5,
      name: 'Exercise Bike',
      url: 'https://lh3.googleusercontent.com/gps-cs-s/AHVAwepLdcsc2f8DH8a-b3JkpmUXACTeEmjx91O4heeq_zgSWqEpwL8w5nXyC1xNauLRZ-_x4L6shlspXMQrLqaE1BKk-BTA7ju7v0eM00TESLq1eAjrzHmknQMVwEgqNfEVNeqL-G7cDg=s680-w680-h510-rw'
    },
    {
      id: 6,
      name: 'Rowing Machine',
      url: 'https://lh3.googleusercontent.com/gps-cs-s/AHVAwepGXBuJU3WG5eAYShZsAm566xNnjD_xPIAX7YbXL9dM68dTs67tL6QcNcfzSWGHM4KFp_usVgyrrOn5BTD3uA6t_oadmpuULxuiCY7akbEFy49IXPTMqgOH0GXTgu-2QOEUG6YY=s680-w680-h510-rw'
    },
    {
      id: 7,
      name: 'Kettlebells',
      url: 'https://lh3.googleusercontent.com/p/AF1QipNlOCN-20-dj4bIKiHKLTd44uLaIhZs08wevDgg=s680-w680-h510-rw'
    },
    {
      id: 8,
      name: 'Cable Machine',
      url: 'https://lh3.googleusercontent.com/gps-cs-s/AHVAwepGXBuJU3WG5eAYShZsAm566xNnjD_xPIAX7YbXL9dM68dTs67tL6QcNcfzSWGHM4KFp_usVgyrrOn5BTD3uA6t_oadmpuULxuiCY7akbEFy49IXPTMqgOH0GXTgu-2QOEUG6YY=s680-w680-h510-rw'
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
          Our Gym Gallery
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