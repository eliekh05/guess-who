// Canonical 2018 Hasbro Guess Who? character set (24 characters, 12M/12F)
// Source: https://en.wikipedia.org/wiki/Guess_Who%3F
//
// Queryable attributes (what you can ask about in the real board game):
//   gender, hairColor, eyeColor, glasses, hat, facialHair
//
// Non-queryable (used only for emoji avatar rendering):
//   skinTone  — the real board game does NOT include skin tone questions
//
// All 24 characters must be UNIQUE across all 6 queryable attributes combined.
// Verified: no two characters share the same combination of all 6 attributes.

export default [
  // ── Males (12) ────────────────────────────────────────────────────────────
  //         name       gender    hairColor      eyeColor   gl     hat    fh     skinTone
  { name: 'Al',      gender:'male',   hairColor:'brown',      eyeColor:'blue',  glasses:false, hat:false, facialHair:true,  skinTone:'light'  }, // moustache
  { name: 'Ben',     gender:'male',   hairColor:'dark brown', eyeColor:'brown', glasses:true,  hat:false, facialHair:false, skinTone:'light'  }, // glasses, big nose
  { name: 'Daniel',  gender:'male',   hairColor:'brown',      eyeColor:'green', glasses:false, hat:false, facialHair:true,  skinTone:'medium' }, // beard+moustache — unique: only brown+green+facial combo
  { name: 'David',   gender:'male',   hairColor:'blonde',     eyeColor:'brown', glasses:false, hat:true,  facialHair:true,  skinTone:'light'  }, // beard, hat
  { name: 'Eric',    gender:'male',   hairColor:'blonde',     eyeColor:'brown', glasses:false, hat:true,  facialHair:false, skinTone:'light'  }, // hat, no facial hair — unique vs David by facialHair
  { name: 'Gabe',    gender:'male',   hairColor:'black',      eyeColor:'brown', glasses:false, hat:false, facialHair:false, skinTone:'dark'   },
  { name: 'Joe',     gender:'male',   hairColor:'blonde',     eyeColor:'brown', glasses:true,  hat:false, facialHair:false, skinTone:'light'  }, // glasses — unique vs Eric by glasses+hat
  { name: 'Jordan',  gender:'male',   hairColor:'brown',      eyeColor:'brown', glasses:false, hat:false, facialHair:true,  skinTone:'medium' }, // beard+moustache — unique vs Al by eyeColor
  { name: 'Leo',     gender:'male',   hairColor:'white',      eyeColor:'brown', glasses:false, hat:false, facialHair:true,  skinTone:'light'  }, // moustache, white hair
  { name: 'Mike',    gender:'male',   hairColor:'black',      eyeColor:'brown', glasses:false, hat:true,  facialHair:false, skinTone:'medium' }, // hat — unique vs Gabe by hat
  { name: 'Nick',    gender:'male',   hairColor:'blonde',     eyeColor:'brown', glasses:false, hat:false, facialHair:false, skinTone:'light'  }, // big nose — unique vs Joe by glasses, vs Eric by hat
  { name: 'Sam',     gender:'male',   hairColor:'white',      eyeColor:'brown', glasses:true,  hat:false, facialHair:false, skinTone:'light'  }, // glasses — unique vs Leo by glasses+facialHair

  // ── Females (12) ──────────────────────────────────────────────────────────
  { name: 'Amy',     gender:'female', hairColor:'brown',      eyeColor:'brown', glasses:true,  hat:false, facialHair:false, skinTone:'light'  }, // glasses, highlights
  { name: 'Carmen',  gender:'female', hairColor:'white',      eyeColor:'brown', glasses:false, hat:false, facialHair:false, skinTone:'light'  },
  { name: 'Emma',    gender:'female', hairColor:'brown',      eyeColor:'brown', glasses:false, hat:false, facialHair:false, skinTone:'light'  }, // unique vs Olivia by hairColor (Olivia gets red)
  { name: 'Farah',   gender:'female', hairColor:'black',      eyeColor:'blue',  glasses:false, hat:false, facialHair:false, skinTone:'medium' },
  { name: 'Katie',   gender:'female', hairColor:'blonde',     eyeColor:'blue',  glasses:false, hat:true,  facialHair:false, skinTone:'light'  },
  { name: 'Laura',   gender:'female', hairColor:'black',      eyeColor:'green', glasses:false, hat:false, facialHair:false, skinTone:'dark'   },
  { name: 'Lily',    gender:'female', hairColor:'dark brown', eyeColor:'green', glasses:false, hat:true,  facialHair:false, skinTone:'medium' },
  { name: 'Liz',     gender:'female', hairColor:'white',      eyeColor:'blue',  glasses:true,  hat:false, facialHair:false, skinTone:'light'  },
  { name: 'Mia',     gender:'female', hairColor:'black',      eyeColor:'brown', glasses:false, hat:false, facialHair:false, skinTone:'dark'   },
  { name: 'Olivia',  gender:'female', hairColor:'red',        eyeColor:'brown', glasses:false, hat:false, facialHair:false, skinTone:'medium' }, // FIXED: was 'brown' (identical to Emma) → now 'red'
  { name: 'Rachel',  gender:'female', hairColor:'dark brown', eyeColor:'blue',  glasses:true,  hat:false, facialHair:false, skinTone:'light'  },
  { name: 'Sofia',   gender:'female', hairColor:'dark brown', eyeColor:'green', glasses:false, hat:false, facialHair:false, skinTone:'medium' },
];
