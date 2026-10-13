/* ==========================================================================
   TRIVIA NIGHT · sample board
   --------------------------------------------------------------------------
   A board is 6 categories, each with 5 questions in order of difficulty.
   They're worth 100, 200, 300, 400 and 500 points.
   Each question has:  q = the question,  a = the answer (only the host sees it).

   To make another board, copy this file, change the questions, and add it to
   the list at the bottom (the game lists every board in window.TRIVIA_BOARDS).
   ========================================================================== */

window.TRIVIA_BOARDS = window.TRIVIA_BOARDS || [];

window.TRIVIA_BOARDS.push({
  id: 'sample',
  title: 'Sample Night',
  categories: [
    {
      name: 'Suits',
      questions: [
        { q: 'Which character gets hired at Pearson Hardman without ever going to law school?', a: 'Mike Ross' },
        { q: "Who is Harvey Specter's long-time assistant, known for knowing everything?", a: 'Donna Paulsen' },
        { q: 'The actress who played Rachel Zane later married into the British royal family. Who is she?', a: 'Meghan Markle' },
        { q: 'In which city is the original Suits set?', a: 'New York City' },
        { q: 'Which 2019 spin-off follows Jessica Pearson into Chicago politics?', a: 'Pearson' }
      ]
    },
    {
      name: 'Coke Studio',
      questions: [
        { q: 'Which 2022 Coke Studio song by Ali Sethi and Shae Gill became a global hit?', a: 'Pasoori' },
        { q: 'Which musician created Coke Studio Pakistan and produced its early seasons?', a: 'Rohail Hyatt' },
        { q: 'In what year did Coke Studio Pakistan first air?', a: '2008' },
        { q: 'Rahat Fateh Ali Khan and Momina Mustehsan sang which Nusrat Fateh Ali Khan classic in Season 9?', a: 'Afreen Afreen' },
        { q: 'Which producer, known by one name, took over Coke Studio for Season 14?', a: 'Xulfi (Zulfiqar Jabbar Khan)' }
      ]
    },
    {
      name: 'Tennis',
      questions: [
        { q: 'Which Grand Slam tournament is played on grass?', a: 'Wimbledon' },
        { q: 'What word means a score of zero in tennis?', a: 'Love' },
        { q: 'Which man has won the most French Open singles titles?', a: 'Rafael Nadal (14)' },
        { q: 'How many Grand Slam singles titles did Serena Williams win?', a: '23' },
        { q: 'Who is the only man to win the calendar-year Grand Slam twice?', a: 'Rod Laver (1962 and 1969)' }
      ]
    },
    {
      name: 'Geography',
      questions: [
        { q: 'Which river flows through Cairo?', a: 'The Nile' },
        { q: 'What is the smallest country in the world by area?', a: 'Vatican City' },
        { q: 'What is the capital of Australia?', a: 'Canberra' },
        { q: 'Counting its overseas territories, which country spans the most time zones?', a: 'France' },
        { q: 'Which country has coastlines on both the Atlantic and Indian Oceans?', a: 'South Africa' }
      ]
    },
    {
      name: 'Food',
      questions: [
        { q: 'What is the main ingredient in guacamole?', a: 'Avocado' },
        { q: 'Which cheese is traditionally used on a Margherita pizza?', a: 'Mozzarella' },
        { q: 'Saffron comes from which flower?', a: 'Crocus' },
        { q: 'Hyderabadi biryani is slow-cooked in a pot sealed with dough. What is this method called?', a: 'Dum' },
        { q: 'Which pastry is used to make éclairs?', a: 'Choux pastry' }
      ]
    },
    {
      name: 'Movies',
      questions: [
        { q: "In The Godfather, what animal's head ends up in a bed?", a: 'A horse' },
        { q: 'Who directed Jurassic Park (1993)?', a: 'Steven Spielberg' },
        { q: 'Which was the first non-English-language film to win Best Picture at the Oscars?', a: 'Parasite' },
        { q: 'Which 2001 Aamir Khan film, about a cricket match against British officers, was nominated for an Oscar?', a: 'Lagaan' },
        { q: 'Which composer scored Inception, Interstellar and Dune?', a: 'Hans Zimmer' }
      ]
    }
  ]
});
