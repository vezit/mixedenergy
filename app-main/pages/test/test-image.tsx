import React from 'react'
import Image from 'next/image'

console.log('Image is', Image)

export default function Page() {
  return (
    <div>
      <Image
        src="/images/mixedenergy-logo.png"
        width={500}
        height={500}
        alt="Picture of the author"
      />
    </div>
  )
}
