import React from 'react';

const Card_Comuna = ({ title, data }) => {
  return (
    <div className="block max-w-sm p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-700 dark:border-gray-700">
      <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        {title}
      </h5>
      <p className="text-3xl font-semibold text-gray-900 dark:text-white">
        {data}
      </p>
    </div>
  );
};

export default Card_Comuna;