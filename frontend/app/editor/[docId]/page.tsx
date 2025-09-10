
'use client';

import React, { useEffect, useState } from 'react';
import { Editor } from '@/components/Editor';

interface PageProps {
    params: {
        docId: string;
    };
}

const EditorPage: React.FC<PageProps> = ({ params }) => {
    const { docId } = params;
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null; // or a loading spinner
    }

    return <Editor docId={docId} />;
};

export default EditorPage;
