import { Button } from '@chakra-ui/react';
import { FaSyncAlt } from 'react-icons/fa';

const Refresh = () => {
  return (
    <Button
      aria-label="Refresh"
      variant="ghost"
      color="gray.500"
      _hover={{ bg: 'gray.100' }}
      _active={{ bg: 'gray.200' }}
      size="sm"
    >
      <FaSyncAlt style={{ marginRight: '8px' }} />
      Refresh
    </Button>
  );
};

export default Refresh;
