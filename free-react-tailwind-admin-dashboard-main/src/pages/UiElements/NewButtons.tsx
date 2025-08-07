
import { Button } from "@chakra-ui/react"
import BeatLoader from "react-spinners/BeatLoader"

const NewButton = () => {
   return (
    <Button
      loading
      colorPalette="blue"
      spinner={<BeatLoader size={8} color="white" />}
    >
      Click me
    </Button>
  )
}

export default NewButton

