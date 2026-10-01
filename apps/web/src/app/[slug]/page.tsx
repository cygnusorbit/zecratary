'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DynamicHomePage from '../page';

export default function DynamicCustomSlugPage() {
  return <DynamicHomePage />;
}
